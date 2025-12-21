/**
 * Variants Lambda function
 *
 * Admin-only write operations; read allowed to non-admin users.
 * - GET: fetch by variantId, or list by productId
 * - POST: create new variant (admin only)
 * - PUT: update existing variant (admin only)
 * - DELETE: delete variant (admin only)
 *
 * API examples
 * - GET /variant?variantId={id}
 * - GET /variant?productId={productId}
 * - POST /variant { variant: IProductVariant }
 * - PUT /variant { variantId: string, variant: IProductVariant }
 * - DELETE /variant?variantId={id}
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

import { constructResponse, isAdmin, JsonLike } from '../Helper';
import IProductVariant from '../../../interface/product/IProductVariant';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import Constants from '../../InfrastructureConstants';

const ddb = new DynamoDBClient({});
const VARIANT_TABLE = process.env.VARIANT_TABLE;

function isStringArray(v: any): v is string[] {
    return Array.isArray(v) && v.every(x => typeof x === 'string');
}

function generateVariantFromInput(input: any): IProductVariant | undefined {
    function isValidVariant(input: any): input is IProductVariant {
        if (!input || typeof input !== 'object') return false;
        if (typeof input.name !== 'string') return false;
        if (typeof input.price !== 'number' || !Number.isFinite(input.price)) return false;
        if (typeof input.stock !== 'number' || !Number.isFinite(input.stock)) return false;
        if (!(input.maximumInOrder === undefined || typeof input.maximumInOrder === 'number')) return false;
        if (!isStringArray(input.relatedProductIds)) return false;
        if (!Array.isArray(input.fields)) return false;
        if (!isStringArray(input.imageUrls)) return false;
        if (typeof input.productId !== 'string') return false;
        if (typeof input.collectionId !== 'string') return false;
        return true;
    }

    if (!isValidVariant(input)) {
        return undefined;
    }
    return {
        name: input.name,
        price: input.price,
        stock: input.stock,
        maximumInOrder: input.maximumInOrder,
        relatedProductIds: input.relatedProductIds,
        fields: input.fields,
        imageUrls: input.imageUrls,
        productId: input.productId,
        collectionId: input.collectionId
    };
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!VARIANT_TABLE) {
            console.error('Variant: VARIANT_TABLE env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const method = (event.httpMethod || '').toUpperCase();
        switch (method) {
            case 'GET': {
                const qs = event.queryStringParameters || {};
                const variantId = qs.variantId;
                const productId = qs.productId;

                if (variantId) {
                    const resp = await ddb.send(new GetItemCommand({
                        TableName: VARIANT_TABLE,
                        Key: marshall({ variantId })
                    }));
                    const item = resp.Item ? (unmarshall(resp.Item) as IProductVariantRecord) : undefined;
                    if (!item) {
                        return constructResponse(404, { message: 'Variant not found' });
                    }
                    return constructResponse(200, item);
                }
                else if (productId) {
                    const queryResp = await ddb.send(new QueryCommand({
                        TableName: VARIANT_TABLE,
                        IndexName: Constants.variantGSINameOnProductId,
                        KeyConditionExpression: 'productId = :pid',
                        ExpressionAttributeValues: marshall({ ':pid': productId })
                    }));
                    const items = (queryResp.Items || []).map(i => unmarshall(i) as IProductVariantRecord);
                    return constructResponse(200, items);
                }
                return constructResponse(400, { message: 'Provide variantId or productId' });
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
                const variant = generateVariantFromInput(parsed.variant ?? parsed.productVariant);
                if (!variant) {
                    return constructResponse(400, { message: 'Invalid variant' });
                }

                // Enforce max 24 variants per product
                const countResp = await ddb.send(new QueryCommand({
                    TableName: VARIANT_TABLE,
                    IndexName: Constants.variantGSINameOnProductId,
                    KeyConditionExpression: 'productId = :pid',
                    ExpressionAttributeValues: marshall({ ':pid': variant.productId })
                }));
                const existingCount = countResp.Count ?? (countResp.Items ? countResp.Items.length : 0);
                if (existingCount >= 24) {
                    return constructResponse(409, { message: 'Variant limit reached for productId', productId: variant.productId, limit: 24 });
                }

                const variantId = randomUUID();
                const record: IProductVariantRecord = { variantId, ...variant };
                await ddb.send(new PutItemCommand({ TableName: VARIANT_TABLE, Item: marshall(record) }));
                return constructResponse(201, { message: 'Variant created', variant: record });
            }
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
                const variantId = typeof parsed.variantId === 'string' ? parsed.variantId : '';
                if (!variantId){
                    return constructResponse(400, { message: 'Missing variantId' });
                }
                const variant = generateVariantFromInput(parsed.variant ?? parsed.productVariant);
                if (!variant) {
                    return constructResponse(400, { message: 'Invalid variant' });
                }

                // Ensure exists
                const existing = await ddb.send(new GetItemCommand({ TableName: VARIANT_TABLE, Key: marshall({ variantId }) }));
                if (!existing.Item) {
                    return constructResponse(404, { message: 'Variant not found' });
                }
                const existingVariant = unmarshall(existing.Item) as IProductVariantRecord;

                // If moving to a different productId, enforce limit on the target productId
                if (existingVariant.productId !== variant.productId) {
                    const countResp = await ddb.send(new QueryCommand({
                        TableName: VARIANT_TABLE,
                        IndexName: Constants.variantGSINameOnProductId,
                        KeyConditionExpression: 'productId = :pid',
                        ExpressionAttributeValues: marshall({ ':pid': variant.productId })
                    }));
                    const existingCount = countResp.Count ?? (countResp.Items ? countResp.Items.length : 0);
                    if (existingCount >= 24) {
                        return constructResponse(409, { message: 'Variant limit reached for productId', productId: variant.productId, limit: 24 });
                    }
                }

                const record: IProductVariantRecord = { variantId, ...variant };
                await ddb.send(new PutItemCommand({ TableName: VARIANT_TABLE, Item: marshall(record) }));
                return constructResponse(200, { message: 'Variant updated', variant: record });
            }
            case 'DELETE': {
                if (!isAdmin(event)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
                const variantId = event.queryStringParameters?.variantId;
                if (!variantId) {
                    return constructResponse(400, { message: 'Missing variantId in query' });
                }

                // optional existence check for clearer error
                const existing = await ddb.send(new GetItemCommand({ TableName: VARIANT_TABLE, Key: marshall({ variantId }) }));
                if (!existing.Item) return constructResponse(404, { message: 'Variant not found' });

                await ddb.send(new DeleteItemCommand({ TableName: VARIANT_TABLE, Key: marshall({ variantId }) }));
                return constructResponse(200, { message: 'Variant deleted', variantId });
            }
            default:
                return constructResponse(405, { message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Variant handler error:', error);
        return constructResponse(500, { message: 'Internal Server Error' });
    }
}
