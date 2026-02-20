import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID, createHmac } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { constructResponse, getClaim, isAdmin } from '../Helper';
import IAddress from '../../../interface/IAddress';
import IProductRecord from '../../../interface/product/IProductRecord';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import IOrderProductRecord from '../../../interface/order/IOrderProductRecord';
import IOrderRecord from '../../../interface/order/IOrderRecord';

const ddb = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(ddb);

const PRODUCT_TABLE = process.env.PRODUCT_TABLE;
const VARIANT_TABLE = process.env.VARIANT_TABLE;
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

type CheckoutItemInput = { productId: string; variantId: string; quantity: number };

type CheckoutCreateBody = {
    source: 'cart' | 'single';
    items: CheckoutItemInput[];
    shippingAddress: IAddress;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    guestUserId?: string;
};

type CheckoutConfirmBody = {
    orderId: string;
    createdAt: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    source: 'cart' | 'single';
    items: CheckoutItemInput[];
    shippingAddress: IAddress;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    guestUserId?: string;
};

type AdminOrderStatusUpdateBody = {
    userId: string;
    createdAt: number;
    status: string;
};

function isValidAddress(address: any): address is IAddress {
    if (!address || typeof address !== 'object') return false;

    const requiredFields: Array<keyof IAddress> = [
        'userLabel',
        'phoneNumber',
        'specificAddress',
        'street',
        'area',
        'postcode',
        'city',
        'state',
        'country',
    ];

    return requiredFields.every((field) => typeof address[field] === 'string' && address[field].trim().length > 0);
}

function normalizeItems(items: CheckoutItemInput[]): CheckoutItemInput[] {
    const byCompositeKey = new Map<string, CheckoutItemInput>();

    for (const item of items) {
        if (!item || typeof item.productId !== 'string' || typeof item.variantId !== 'string' || typeof item.quantity !== 'number') {
            continue;
        }
        const quantity = Math.floor(item.quantity);
        if (quantity <= 0) {
            continue;
        }

        const productId = item.productId.trim();
        const variantId = item.variantId.trim();
        if (!productId || !variantId) {
            continue;
        }

        const key = `${productId}::${variantId}`;
        const existing = byCompositeKey.get(key);
        if (existing) {
            byCompositeKey.set(key, { ...existing, quantity: existing.quantity + quantity });
        } else {
            byCompositeKey.set(key, { productId, variantId, quantity });
        }
    }

    return Array.from(byCompositeKey.values());
}

function normalizeGuestUserId(value: unknown): string {
    if (typeof value !== 'string') {
        return `guest_${randomUUID()}`;
    }
    const trimmed = value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!trimmed) {
        return `guest_${randomUUID()}`;
    }
    return trimmed.startsWith('guest_') ? trimmed : `guest_${trimmed}`;
}

function resolveUserId(event: APIGatewayProxyEvent, guestUserId?: string): { userId: string; isGuest: boolean } {
    const authenticatedUserId = getClaim(event, 'sub');
    if (authenticatedUserId && authenticatedUserId.trim().length > 0) {
        return { userId: authenticatedUserId.trim(), isGuest: false };
    }

    return { userId: normalizeGuestUserId(guestUserId), isGuest: true };
}

async function getProduct(productId: string): Promise<IProductRecord | null> {
    const response = await doc.send(new GetCommand({ TableName: PRODUCT_TABLE, Key: { productId } }));
    return (response.Item as IProductRecord | undefined) ?? null;
}

async function getVariant(variantId: string): Promise<IProductVariantRecord | null> {
    const response = await doc.send(new GetCommand({ TableName: VARIANT_TABLE, Key: { variantId } }));
    return (response.Item as IProductVariantRecord | undefined) ?? null;
}

async function buildOrderProducts(items: CheckoutItemInput[]): Promise<{ products: IOrderProductRecord[]; subtotal: number; shippingFee: number; tax: number }> {
    const lines: IOrderProductRecord[] = [];
    let subtotal = 0;
    let shippingFee = 0;
    let tax = 0;

    for (const item of items) {
        const [product, variant] = await Promise.all([
            getProduct(item.productId),
            getVariant(item.variantId),
        ]);

        if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
        }
        if (!variant) {
            throw new Error(`Variant not found: ${item.variantId}`);
        }
        if (variant.productId !== product.productId) {
            throw new Error(`Variant ${item.variantId} does not belong to product ${item.productId}`);
        }

        const quantity = item.quantity;
        if (quantity <= 0 || !Number.isFinite(quantity)) {
            throw new Error('Invalid quantity');
        }
        if (typeof variant.stock === 'number' && quantity > variant.stock) {
            throw new Error(`Only ${variant.stock} units available for ${product.name}`);
        }
        if (typeof variant.maximumInOrder === 'number' && quantity > variant.maximumInOrder) {
            throw new Error(`Maximum quantity per order is ${variant.maximumInOrder} for ${product.name}`);
        }

        const unitPrice = Number(variant.price ?? 0);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new Error(`Invalid price for ${product.name}`);
        }

        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;
        shippingFee += Number(variant.shipping ?? 0) * quantity;
        tax += Number(variant.tax ?? 0) * quantity;

        lines.push({
            productId: product.productId,
            variantId: variant.variantId,
            quantity,
            unitPrice,
            lineTotal,
            productName: product.name,
            variantName: variant.name,
            imageUrl: product.imageUrls?.[0] ?? '',
        });
    }

    return { products: lines, subtotal, shippingFee, tax };
}

async function createRazorpayOrder(totalAmount: number, receipt: string): Promise<{ id: string; amount: number; currency: 'INR' }> {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay is not configured');
    }

    const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: totalAmount,
            currency: 'INR',
            receipt,
            payment_capture: 1,
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload?.id !== 'string') {
        throw new Error(payload?.error?.description || 'Unable to create Razorpay order');
    }

    return {
        id: payload.id,
        amount: typeof payload.amount === 'number' ? payload.amount : totalAmount,
        currency: 'INR',
    };
}

async function getRazorpayOrder(razorpayOrderId: string): Promise<{ id: string; amount: number; currency: string }> {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay is not configured');
    }

    const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`;
    const response = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`, {
        method: 'GET',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload?.id !== 'string' || typeof payload?.amount !== 'number') {
        throw new Error(payload?.error?.description || 'Unable to fetch Razorpay order');
    }

    return {
        id: payload.id,
        amount: payload.amount,
        currency: typeof payload.currency === 'string' ? payload.currency : 'INR',
    };
}

function verifyRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean {
    if (!RAZORPAY_KEY_SECRET) {
        return false;
    }
    const message = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = createHmac('sha256', RAZORPAY_KEY_SECRET).update(message).digest('hex');
    return expected === razorpaySignature;
}

async function handleCreateCheckout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!event.body) {
        return constructResponse(400, { message: 'Missing request body' });
    }

    let parsed: CheckoutCreateBody;
    try {
        parsed = JSON.parse(event.body) as CheckoutCreateBody;
    } catch {
        return constructResponse(400, { message: 'Invalid JSON body' });
    }

    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        return constructResponse(400, { message: 'Missing checkout items' });
    }
    if (!isValidAddress(parsed.shippingAddress)) {
        return constructResponse(400, { message: 'Invalid shipping address' });
    }

    const source = parsed.source === 'single' ? 'single' : 'cart';
    const { userId, isGuest } = resolveUserId(event, parsed.guestUserId);

    const normalizedItems = normalizeItems(parsed.items);
    if (normalizedItems.length === 0) {
        return constructResponse(400, { message: 'No valid checkout items' });
    }

    const createdAt = Date.now();
    const orderId = randomUUID();

    const { products, subtotal, shippingFee, tax } = await buildOrderProducts(normalizedItems);
    const total = subtotal + shippingFee + tax;

    const razorpayOrder = await createRazorpayOrder(total, orderId);

    return constructResponse(200, {
        orderId,
        createdAt,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: RAZORPAY_KEY_ID,
        source,
        ...(isGuest ? { guestUserId: userId } : {}),
    });
}

async function handleConfirmCheckout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!event.body) {
        return constructResponse(400, { message: 'Missing request body' });
    }

    let parsed: CheckoutConfirmBody;
    try {
        parsed = JSON.parse(event.body) as CheckoutConfirmBody;
    } catch {
        return constructResponse(400, { message: 'Invalid JSON body' });
    }

    if (!parsed?.orderId || !parsed?.createdAt || !parsed?.razorpayOrderId || !parsed?.razorpayPaymentId || !parsed?.razorpaySignature) {
        return constructResponse(400, { message: 'Missing payment confirmation details' });
    }
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
        return constructResponse(400, { message: 'Missing checkout items' });
    }
    if (!isValidAddress(parsed.shippingAddress)) {
        return constructResponse(400, { message: 'Invalid shipping address' });
    }

    if (!verifyRazorpaySignature(parsed.razorpayOrderId, parsed.razorpayPaymentId, parsed.razorpaySignature)) {
        return constructResponse(400, { message: 'Invalid Razorpay signature' });
    }

    const { userId } = resolveUserId(event, parsed.guestUserId);

    const normalizedItems = normalizeItems(parsed.items);
    if (normalizedItems.length === 0) {
        return constructResponse(400, { message: 'No valid checkout items' });
    }

    const { products, subtotal, shippingFee, tax } = await buildOrderProducts(normalizedItems);
    const total = subtotal + shippingFee + tax;

    const razorpayOrder = await getRazorpayOrder(parsed.razorpayOrderId);
    if (razorpayOrder.id !== parsed.razorpayOrderId) {
        return constructResponse(400, { message: 'Razorpay order mismatch' });
    }
    if (razorpayOrder.currency !== 'INR') {
        return constructResponse(400, { message: 'Unsupported Razorpay currency' });
    }
    if (razorpayOrder.amount !== total) {
        return constructResponse(400, { message: 'Payment amount mismatch' });
    }

    const existingOrderResponse = await doc.send(new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { userId, createdAt: parsed.createdAt },
    }));

    const existingOrder = existingOrderResponse.Item as IOrderRecord | undefined;
    if (existingOrder) {
        if (existingOrder.orderId !== parsed.orderId || existingOrder.razorpayOrderId !== parsed.razorpayOrderId) {
            return constructResponse(409, { message: 'Order key conflict detected' });
        }
        return constructResponse(200, {
            message: 'Payment already confirmed',
            orderId: parsed.orderId,
            createdAt: parsed.createdAt,
        });
    }

    const orderRecord: IOrderRecord = {
        userId,
        createdAt: parsed.createdAt,
        orderId: parsed.orderId,
        status: 'order placed',
        paymentStatus: 'paid',
        paymentMode: 'Pre Paid',
        paymentDetails: 'Razorpay',
        subtotal,
        shippingFee,
        tax,
        total,
        currency: 'INR',
        products,
        shippingAddress: parsed.shippingAddress,
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail,
        customerPhone: parsed.customerPhone,
        razorpayOrderId: parsed.razorpayOrderId,
        razorpayPaymentId: parsed.razorpayPaymentId,
        razorpaySignature: parsed.razorpaySignature,
    };

    await doc.send(new PutCommand({ TableName: ORDERS_TABLE, Item: orderRecord }));

    return constructResponse(200, {
        message: 'Payment confirmed',
        orderId: parsed.orderId,
        createdAt: parsed.createdAt,
    });
}

async function handleGetOrders(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const authenticatedUserId = getClaim(event, 'sub');
    if (!authenticatedUserId || authenticatedUserId.trim().length === 0) {
        return constructResponse(401, { message: 'Unauthorized' });
    }

    const queryParams = event.queryStringParameters || {};
    const includeAllOrders = queryParams.all === 'true';

    if (includeAllOrders) {
        if (!isAdmin(event)) {
            return constructResponse(403, { message: 'Forbidden: Admin access required' });
        }

        const scanResponse = await doc.send(new ScanCommand({
            TableName: ORDERS_TABLE,
        }));

        const orders = (scanResponse.Items as IOrderRecord[] | undefined) ?? [];
        return constructResponse(200, orders);
    }

    const queryResponse = await doc.send(new QueryCommand({
        TableName: ORDERS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': authenticatedUserId.trim(),
        },
        ScanIndexForward: false,
    }));

    const orders = (queryResponse.Items as IOrderRecord[] | undefined) ?? [];
    return constructResponse(200, orders);
}

async function handleAdminUpdateOrderStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!isAdmin(event)) {
        return constructResponse(403, { message: 'Forbidden: Admin access required' });
    }

    if (!event.body) {
        return constructResponse(400, { message: 'Missing request body' });
    }

    let parsed: AdminOrderStatusUpdateBody;
    try {
        parsed = JSON.parse(event.body) as AdminOrderStatusUpdateBody;
    } catch {
        return constructResponse(400, { message: 'Invalid JSON body' });
    }

    const userId = typeof parsed.userId === 'string' ? parsed.userId.trim() : '';
    const createdAt = Number(parsed.createdAt);
    const status = typeof parsed.status === 'string' ? parsed.status.trim() : '';

    if (!userId || !Number.isFinite(createdAt) || !status) {
        return constructResponse(400, { message: 'Missing or invalid userId, createdAt, or status' });
    }

    const existingOrderResponse = await doc.send(new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { userId, createdAt },
    }));

    const existingOrder = existingOrderResponse.Item as IOrderRecord | undefined;
    if (!existingOrder) {
        return constructResponse(404, { message: 'Order not found' });
    }

    await doc.send(new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: { userId, createdAt },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': status,
        },
    }));

    return constructResponse(200, {
        message: 'Order status updated',
        userId,
        createdAt,
        status,
    });
}

async function handleAdminDeleteOrder(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (!isAdmin(event)) {
        return constructResponse(403, { message: 'Forbidden: Admin access required' });
    }

    const queryParams = event.queryStringParameters || {};
    const userId = typeof queryParams.userId === 'string' ? queryParams.userId.trim() : '';
    const createdAt = Number(queryParams.createdAt);

    if (!userId || !Number.isFinite(createdAt)) {
        return constructResponse(400, { message: 'Missing or invalid userId or createdAt' });
    }

    const existingOrderResponse = await doc.send(new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { userId, createdAt },
    }));

    if (!existingOrderResponse.Item) {
        return constructResponse(404, { message: 'Order not found' });
    }

    await doc.send(new DeleteCommand({
        TableName: ORDERS_TABLE,
        Key: { userId, createdAt },
    }));

    return constructResponse(200, {
        message: 'Order deleted',
        userId,
        createdAt,
    });
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!PRODUCT_TABLE || !VARIANT_TABLE || !ORDERS_TABLE) {
            console.error('Checkout lambda configuration missing tables');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const method = (event.httpMethod || '').toUpperCase();
        if (method === 'GET') {
            return await handleGetOrders(event);
        }
        if (method === 'POST') {
            return await handleCreateCheckout(event);
        }
        if (method === 'PUT') {
            if (event.body) {
                try {
                    const parsed = JSON.parse(event.body) as Partial<AdminOrderStatusUpdateBody>;
                    if (typeof parsed?.userId === 'string' && typeof parsed?.createdAt === 'number' && typeof parsed?.status === 'string') {
                        return await handleAdminUpdateOrderStatus(event);
                    }
                } catch {
                    // fall through to standard checkout confirmation handler
                }
            }
            return await handleConfirmCheckout(event);
        }
        if (method === 'DELETE') {
            return await handleAdminDeleteOrder(event);
        }

        return constructResponse(405, { message: 'Method Not Allowed' });
    } catch (error: any) {
        console.error('Checkout handler error:', error);
        return constructResponse(500, { message: error?.message || 'Internal Server Error' });
    }
}
