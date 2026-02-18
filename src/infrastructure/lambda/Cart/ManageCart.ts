/**
 * ManageCart Lambda function
 * This function handles adding, updating, retrieving, and deleting a user's shopping cart.
 *
 * Admins can act on behalf of another user by providing a target userId:
 * - GET /cart?userId={userId}
 * - POST /cart (body can include { userId: string, ... })
 * - DELETE /cart?userId={userId}
 *
 * API
 * - GET /cart - get user's cart
 * - POST /cart - add/update one item (body: { productId: string, variantId: string, quantity: number })
 *              - OR replace cart (body: { products: { productId: string, variantId: string, quantity: number }[] })
 * - DELETE /cart - delete user's cart
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { constructResponse, getClaim, isAuthorized, isAdmin } from '../Helper';

import ICartEntry, { ICartEntryItem } from '../../../interface/product/ICartEntry';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import IProductRecord from '../../../interface/product/IProductRecord';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CART_TABLE_NAME = process.env.CART_TABLE_NAME || '';
const VARIANT_TABLE_NAME = process.env.VARIANT_TABLE_NAME || '';
const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || '';

function isCartItemStructurallyValid(product: ICartEntryItem): boolean {
    return !!product.productId
        && typeof product.productId === 'string'
        && !!product.variantId
        && typeof product.variantId === 'string'
        && !!product.quantity
        && typeof product.quantity === 'number'
        && product.quantity >= 1;
}

async function sanitizeCartProducts(products: ICartEntryItem[]): Promise<{ sanitizedProducts: ICartEntryItem[], changed: boolean }> {
    const sanitizedProducts: ICartEntryItem[] = [];
    let changed = false;

    for (const product of products || []) {
        if (!isCartItemStructurallyValid(product)) {
            changed = true;
            continue;
        }

        const [variantDetails, productDetails] = await Promise.all([
            docClient.send(new GetCommand({ TableName: VARIANT_TABLE_NAME, Key: { variantId: product.variantId } })),
            docClient.send(new GetCommand({ TableName: PRODUCT_TABLE_NAME, Key: { productId: product.productId } })),
        ]);

        const variantRecord = variantDetails.Item as IProductVariantRecord | undefined;
        const productRecord = productDetails.Item as IProductRecord | undefined;

        if (!productRecord || !variantRecord) {
            changed = true;
            continue;
        }

        if (variantRecord.productId !== product.productId) {
            changed = true;
            continue;
        }

        let allowedQuantity = product.quantity;

        if (variantRecord.stock !== undefined) {
            if (variantRecord.stock < 1) {
                changed = true;
                continue;
            }
            allowedQuantity = Math.min(allowedQuantity, variantRecord.stock);
        }

        if (variantRecord.maximumInOrder !== undefined) {
            if (variantRecord.maximumInOrder < 1) {
                changed = true;
                continue;
            }
            allowedQuantity = Math.min(allowedQuantity, variantRecord.maximumInOrder);
        }

        if (allowedQuantity < 1 || !Number.isFinite(allowedQuantity)) {
            changed = true;
            continue;
        }

        if (allowedQuantity !== product.quantity) {
            changed = true;
        }

        sanitizedProducts.push({ ...product, quantity: allowedQuantity });
    }

    if (!changed && sanitizedProducts.length !== products.length) {
        changed = true;
    }

    return { sanitizedProducts, changed };
}

/**
 * Checks if the cart is valid by verifying each product configuration.
 * ! If multiple products are invalid, only the first will be reported. 
 * ! Must manually call isCartProductConfigurationValid for each product to get all errors.
 * @param products: ICartEntry - The cart entry to validate
 * @returns Promise<{isValid: boolean, errorMessage?: string}> - Validation result
 */
async function isCartValid(products: ICartEntry): Promise<{isValid: boolean, errorMessage?: string}> {
    if (!products.products || !Array.isArray(products.products)) {
        return { isValid: false, errorMessage: 'Invalid products array' };
    }
    for (const product of products.products) {
        const validation = await isCartProductConfigurationValid(product);
        if (!validation.isValid) {
            return validation;
        }
    }
    return { isValid: true };
}

/**
 * Checks if a single cart product configuration is valid.
 * @param product: ICartEntryItem - The cart product item to validate
 * @returns Promise<{isValid: boolean, errorMessage?: string}> - Validation result
 */
async function isCartProductConfigurationValid(product: ICartEntryItem): Promise<{isValid: boolean, errorMessage?: string}> {
    if (!product.productId || typeof product.productId !== 'string') {
        return { isValid: false, errorMessage: 'Invalid productId' };
    }
    else if(!product.variantId || typeof product.variantId !== 'string') {
        return { isValid: false, errorMessage: 'Invalid variantId' };
    }
    else if (!product.quantity || typeof product.quantity !== 'number' || product.quantity < 1) {
        return { isValid: false, errorMessage: 'Invalid quantity' };
    }
    else {
        const [variantDetails, productDetails] = await Promise.all([
            docClient.send(new GetCommand({ TableName: VARIANT_TABLE_NAME, Key: { variantId: product.variantId } })),
            docClient.send(new GetCommand({ TableName: PRODUCT_TABLE_NAME, Key: { productId: product.productId } })),
        ]);
        const variantRecord = variantDetails.Item as IProductVariantRecord | undefined;
        const productRecord = productDetails.Item as IProductRecord | undefined;

        if (!productRecord || !variantRecord || variantRecord.productId !== product.productId) {
            return { isValid: false, errorMessage: 'Product and variant mismatch' };
        }
        else if(variantRecord.stock !== undefined && variantRecord.stock < product.quantity) {
            return { isValid: false, errorMessage: 'Insufficient stock' };
        }
        else if(variantRecord.maximumInOrder !== undefined && variantRecord.maximumInOrder < product.quantity) {
            return { isValid: false, errorMessage: 'Quantity exceeds maximum allowed in order' };
        }
    }
    return { isValid: true };
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        // Don't allow unauthenticated access beyond this point
        const callerUserId = getClaim(event, 'sub');
        if (!callerUserId) {
            return constructResponse(401, { message: 'Unauthorized: User ID not found in token' });
        }

        // Check if the server is properly configured
        if (!CART_TABLE_NAME) {
            console.error('ManageCart: CART_TABLE_NAME env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }
        if(!VARIANT_TABLE_NAME) {
            console.error('ManageCart: VARIANT_TABLE_NAME env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }
        if(!PRODUCT_TABLE_NAME) {
            console.error('ManageCart: PRODUCT_TABLE_NAME env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const httpMethod = event.httpMethod;
        if(httpMethod === 'GET' || httpMethod === 'DELETE') {
            // For GET and DELETE, userId is passed as a query parameter
            const queryParams = event.queryStringParameters || {};
            let targetUserId = queryParams['userId'] || callerUserId;

            // Check Authorization
            if(!isAuthorized(event, targetUserId)) {
                return constructResponse(403, { message: 'Forbidden: Insufficient permissions' });
            }

            if(httpMethod === 'GET') {
                const getCommand = new GetCommand({ TableName: CART_TABLE_NAME, Key: { userId: targetUserId }});
                const result = await docClient.send(getCommand);
                const cartRecord = (result.Item || { userId: targetUserId, products: [] }) as { userId: string, products: ICartEntryItem[] };
                const { sanitizedProducts, changed } = await sanitizeCartProducts(cartRecord.products || []);

                if (changed) {
                    const putCommand = new PutCommand({ TableName: CART_TABLE_NAME, Item: { userId: targetUserId, products: sanitizedProducts } });
                    await docClient.send(putCommand);
                }

                return constructResponse(200, { userId: targetUserId, products: sanitizedProducts, cartAdjusted: changed });
            }
            else {
                // handle DELETE
                const deleteCommand = new DeleteCommand({ TableName: CART_TABLE_NAME, Key: { userId: targetUserId }});
                await docClient.send(deleteCommand);
                return constructResponse(200, { message: 'Cart deleted successfully' });
            }
        }
        else if(httpMethod === 'POST') {
            if (!event.body) {
                return constructResponse(400, { message: 'Missing request body' });
            }
            let parsed: any;
            try { parsed = JSON.parse(event.body) || {}; } catch { return constructResponse(400, { message: 'Invalid JSON body' }); }
            let targetUserId = parsed.userId?.trim() || callerUserId;

            // Check Authorization
            if(!isAuthorized(event, targetUserId)) {
                return constructResponse(403, { message: 'Forbidden: Insufficient permissions' });
            }

            // Payload options:
            // 1) Replace: { products: [{ productId, quantity, variantId }, ...] }
            // 2) Upsert single item: { productId: string, variantId: string, quantity: number }
            if(Array.isArray(parsed.products)) { 
                /* Should Replace the entire cart */
                // Filter out duplicate product+variant entries, keeping the last occurrence
                const uniqueProductsMap: { [key: string]: ICartEntryItem } = {};
                for (let i = parsed.products.length - 1; i >= 0; i--) {
                    const item = parsed.products[i] as ICartEntryItem;
                    const compositeKey = `${item.productId}::${item.variantId}`;
                    uniqueProductsMap[compositeKey] = item;
                }
                parsed.products = Object.values(uniqueProductsMap);

                // Sanitize the cart (clamp quantities/remove invalid or unavailable items)
                const { sanitizedProducts, changed } = await sanitizeCartProducts(parsed.products);

                // Replace the cart
                const putCommand = new PutCommand({ TableName: CART_TABLE_NAME, Item: { userId: targetUserId, products: sanitizedProducts }});
                await docClient.send(putCommand);
                return constructResponse(200, { message: 'Cart replaced successfully', cartAdjusted: changed });
            }
            else if(typeof parsed.productId === 'string' && typeof parsed.quantity === 'number' && typeof parsed.variantId === 'string') {
                /** Upsert a single item */
                const productToUpsert: ICartEntryItem = { productId: parsed.productId, quantity: parsed.quantity, variantId: parsed.variantId };
                const productValidation = await isCartProductConfigurationValid(productToUpsert);
                if(!productValidation.isValid) {
                    return constructResponse(400, { message: `${productValidation.errorMessage}` });
                }
                // Get existing cart
                const getCommand = new GetCommand({ TableName: CART_TABLE_NAME, Key: { userId: targetUserId }});
                const existingCartResult = await docClient.send(getCommand);
                let existingCart = existingCartResult.Item as ICartEntry || { userId: targetUserId, products: [] };

                // Check if product already exists in cart
                const productIndex = existingCart.products.findIndex(p => p.productId === productToUpsert.productId && p.variantId === productToUpsert.variantId);
                if(productIndex >= 0) {
                    // Update quantity
                    existingCart.products[productIndex].quantity = productToUpsert.quantity;
                }
                else {
                    // Add new product
                    existingCart.products.push(productToUpsert);
                }
                // Save updated cart
                const putCommand = new PutCommand({ TableName: CART_TABLE_NAME, Item: existingCart });
                await docClient.send(putCommand);
                return constructResponse(200, { message: 'Cart updated successfully' });
            }
        }
        return constructResponse(405, { message: 'Method Not Allowed' });
    }
    catch (error) {
        console.error('Error in ManageCart function:', { error, event });
        return constructResponse(500, { message: 'Internal server error' });
    }
}