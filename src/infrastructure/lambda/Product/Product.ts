/**
 * Products Lambda function
 *
 * Admin-only write operations; read allowed to non-admin users.
 * - GET: fetch by productId, list by collectionId, list featured products, or list favourite products within a collection
 * - POST: create new product (admin only)
 * - PUT: update existing product (admin only)
 * - DELETE: delete product and all existing variants of it (admin only)
 *
 * API examples
 * - GET /product?productId={id}
 * - GET /product?collectionId={cid}
 * - GET /product?featured=true
 * - GET /product?collectionId={cid}&favourite=true
 * - POST /product { product: IProduct }
 * - PUT /product { productId: string, product: IProduct }
 * - PUT /product-default-variant { productId: string, defaultVariantId: string }
 * - DELETE /product?productId={id}
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

import { constructResponse, isAdmin, JsonLike } from '../Helper';
import IProduct from '../../../interface/product/IProduct';
import IProductRecord from '../../../interface/product/IProductRecord';
import Constants from '../../InfrastructureConstants';

const ddb = new DynamoDBClient({});
const PRODUCT_TABLE = process.env.PRODUCT_TABLE;
const VARIANT_TABLE = process.env.VARIANT_TABLE;

function generateProductFromInput(input: any): IProduct | null {
    function isValidItem(input: any): input is Partial<IProduct> & Pick<IProduct, 'name' | 'fields' | 'imageUrls'> {
        if (!input || typeof input !== 'object') return false;
        if (typeof input.name !== 'string') return false;
        if (typeof input.description !== 'undefined' && typeof input.description !== 'string') return false;
        if (typeof input.collectionId !== 'undefined' && typeof input.collectionId !== 'string') return false;
        if (typeof input.defaultVariantId !== 'undefined' && typeof input.defaultVariantId !== 'string') return false;
        if (typeof input.featured !== 'undefined' && input.featured !== 'true' && input.featured !== 'false') return false;
        const fav = (input as any).favourite;
        if (typeof fav !== 'undefined' && fav !== 'true' && fav !== 'false') return false;
        if (!Array.isArray(input.fields)) return false;
        if (!Array.isArray(input.imageUrls)) return false;
        return true;
    }
    if (!isValidItem(input)) {
        return null;
    }
    const favourite = (input as any).favourite;
    return {
        name: input.name,
        featured: input.featured === 'true' ? 'true' : 'false',
        favourite: favourite === 'true' ? 'true' : 'false',
        fields: input.fields,
        imageUrls: input.imageUrls,
        ...(typeof input.collectionId === 'string' ? { collectionId: input.collectionId } : {}),
        ...(typeof input.description === 'string' ? { description: input.description } : {}),
        ...(typeof input.defaultVariantId === 'string' ? { defaultVariantId: input.defaultVariantId } : {})
    };
}

function normalizeFlags(record: any): IProductRecord {
    const favourite = record?.favourite ?? record?.favourites;
    return {
        ...record,
        featured: record?.featured === 'true' ? 'true' : 'false',
        favourite: favourite === 'true' ? 'true' : 'false',
    } as IProductRecord;
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!PRODUCT_TABLE) {
            console.error('Product: PRODUCT_TABLE env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const method = (event.httpMethod || '').toUpperCase();
        switch (method) {
            case 'PUT': {
                if (!isAdmin(event)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
                let parsed: JsonLike = {};
                if (event.body) {
                    try { 
                        parsed = JSON.parse(event.body); 
                    } 
                    catch {
                        return constructResponse(400, { message: 'Invalid JSON body' });
                    }
                }
                const path = (event.path || event.resource || '').toLowerCase();
                if(path.includes('product-default-variant')) {
                    const productId = parsed.productId as string | undefined;
                    const defaultVariantId = parsed.defaultVariantId as string | undefined;
                    if (typeof productId !== 'string' || typeof defaultVariantId !== 'string') {
                        return constructResponse(400, { message: 'Invalid productId or defaultVariantId' });
                    }
                    // Update only the defaultVariantId field
                    await ddb.send(new UpdateItemCommand({
                        TableName: PRODUCT_TABLE,
                        Key: marshall({ productId }),
                        UpdateExpression: 'SET defaultVariantId = :dvid',
                        ExpressionAttributeValues: marshall({ ':dvid': defaultVariantId }),
                        ConditionExpression: 'attribute_exists(productId)'
                    }));
                    return constructResponse(200, { message: 'Default variant updated', productId, defaultVariantId });
                }
                else {
                    const item = (parsed.item ?? parsed.product) as IProduct | undefined;
                    const productId = parsed.productId as string | undefined;
                    if (typeof productId !== 'string') {
                        return constructResponse(400, { message: 'Missing productId' });
                    }
                    const product = generateProductFromInput(item);
                    if (!product) {
                        return constructResponse(400, { message: 'Invalid item' });
                    }
                    
                    // Ensure exists
                    const existing = await ddb.send(new GetItemCommand({ TableName: PRODUCT_TABLE, Key: marshall({ productId }) }));
                    if (!existing.Item) {
                        return constructResponse(404, { message: 'Item not found' });
                    }

                    const record: IProductRecord = { productId, ...product };
                    await ddb.send(new PutItemCommand({ TableName: PRODUCT_TABLE, Item: marshall(record) }));
                    return constructResponse(200, { message: 'Item updated', item: record });
                }
            }
            case 'GET': {
                const qs = event.queryStringParameters || {};
                const productId = qs.productId;
                const collectionId = qs.collectionId;
                const featured = qs.featured;
                const favourite = qs.favourite;

                if (productId) {
                    const resp = await ddb.send(new GetItemCommand({
                        TableName: PRODUCT_TABLE,
                        Key: marshall({ productId })
                    }));
                    const item = resp.Item ? normalizeFlags(unmarshall(resp.Item) as IProductRecord) : undefined;
                    if (!item) {
                        return constructResponse(404, { message: 'Item not found' });
                    }
                    return constructResponse(200, item);
                }

                // Featured products across entire backend
                if (featured) {
                    if (featured !== 'true') {
                        return constructResponse(400, { message: 'featured must be true' });
                    }
                    const queryResp = await ddb.send(new QueryCommand({
                        TableName: PRODUCT_TABLE,
                        IndexName: Constants.productGSINameOnFeatured,
                        KeyConditionExpression: 'featured = :featured',
                        ExpressionAttributeValues: marshall({ ':featured': 'true' })
                    }));
                    const items = (queryResp.Items || []).map(i => normalizeFlags(unmarshall(i) as IProductRecord));
                    return constructResponse(200, items);
                }

                // Favourite products within a specific collection
                if (collectionId && favourite) {
                    if (favourite !== 'true') {
                        return constructResponse(400, { message: 'favourite must be true' });
                    }
                    const queryResp = await ddb.send(new QueryCommand({
                        TableName: PRODUCT_TABLE,
                        IndexName: Constants.productGSINameOnCollectionFavourite,
                        KeyConditionExpression: 'collectionId = :cid AND favourite = :fav',
                        ExpressionAttributeValues: marshall({ ':cid': collectionId, ':fav': 'true' })
                    }));
                    const items = (queryResp.Items || []).map(i => normalizeFlags(unmarshall(i) as IProductRecord));
                    return constructResponse(200, items);
                }

                if (collectionId) {
                    const queryResp = await ddb.send(new QueryCommand({
                        TableName: PRODUCT_TABLE,
                        IndexName: Constants.productGSINameOnCollectionId,
                        KeyConditionExpression: 'collectionId = :cid',
                        ExpressionAttributeValues: marshall({ ':cid': collectionId })
                    }));
                    const items = (queryResp.Items || []).map(i => normalizeFlags(unmarshall(i) as IProductRecord));
                    return constructResponse(200, items);
                }
                return constructResponse(400, { message: 'Provide productId, featured=true, collectionId, or collectionId with favourite=true' });
            }
            case 'POST': {
                if (!isAdmin(event)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
                let parsed: JsonLike = {};
                if (event.body) {
                    try { 
                        parsed = JSON.parse(event.body); 
                    } 
                    catch { 
                        return constructResponse(400, { message: 'Invalid JSON body' }); 
                    }
                }
                const product = generateProductFromInput(parsed.product);
                if (!product) {
                    return constructResponse(400, { message: 'Invalid product' });
                }

                const productId = randomUUID();
                const record: IProductRecord = { productId, ...product };
                await ddb.send(new PutItemCommand({ TableName: PRODUCT_TABLE, Item: marshall(record) }));
                return constructResponse(201, { message: 'Item created', item: record });
            }
            case 'DELETE': {
                if (!isAdmin(event)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
                const productId = event.queryStringParameters?.productId;
                if (!productId) {
                    return constructResponse(400, { message: 'Missing productId in query' });
                }

                if (!VARIANT_TABLE) {
                    console.error('Item: VARIANT_TABLE env var not set');
                    return constructResponse(500, { message: 'Server configuration error' });
                }

                // Existence check for clearer error
                const existing = await ddb.send(new GetItemCommand({ TableName: PRODUCT_TABLE, Key: marshall({ productId }) }));
                if (!existing.Item) {
                    return constructResponse(404, { message: 'Item not found' });
                }

                // Gather all variantIds for this product, enforce transaction limit (25 ops: 1 item + up to 24 variants)
                const variantQuery = await ddb.send(new QueryCommand({
                    TableName: VARIANT_TABLE,
                    IndexName: Constants.variantGSINameOnProductId,
                    KeyConditionExpression: 'productId = :pid',
                    ExpressionAttributeValues: marshall({ ':pid': productId })
                }));
                const variantIds = (variantQuery.Items || []).map(i => (unmarshall(i) as { variantId?: string }).variantId);
                const canDeleteAtomically = 24; // number of variants we can delete along with the product in a single transaction, AWS provided
                if (variantIds.length > canDeleteAtomically) {
                    return constructResponse(409, {
                        message: 'Too many variants to delete atomically',
                        productId,
                        variantCount: variantIds.length,
                        limit: canDeleteAtomically
                    });
                }

                const transactItems = [
                    { Delete: { TableName: PRODUCT_TABLE, Key: marshall({ productId }), ConditionExpression: 'attribute_exists(productId)' } },
                    ...variantIds.map(variantId => ({
                        Delete: {
                            TableName: VARIANT_TABLE,
                            Key: marshall({ variantId }),
                            ConditionExpression: '#pid = :pid AND attribute_exists(variantId)', //TODO: can remove AND check?
                            ExpressionAttributeNames: { '#pid': 'productId' },
                            ExpressionAttributeValues: marshall({ ':pid': productId })
                        }
                    }))
                ];

                try {
                    await ddb.send(new TransactWriteItemsCommand({ TransactItems: transactItems }));
                } catch (err: any) {
                    const name = err?.name || String(err);
                    if (name === 'TransactionCanceledException') {
                        return constructResponse(409, { message: 'Delete failed due to concurrent changes', productId });
                    }
                    throw err;
                }

                return constructResponse(200, { message: 'Item and variants deleted', productId, variantsDeleted: variantIds.length });
            }
            default:
                return constructResponse(405, { message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Item handler error:', error);
        return constructResponse(500, { message: 'Internal Server Error' });
    }
}
