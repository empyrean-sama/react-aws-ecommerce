/**
 * Products Lambda function
 *
 * Admin-only write operations; read allowed to non-admin users.
 * - GET: fetch by productId, list by collectionId (optionally filter by tag), list featured products, or list favourite products within a collection (optionally filter by tag)
 * - GET (product-tags): list unique tags within a collection
 * - POST: create new product (admin only)
 * - PUT: update existing product (admin only)
 * - DELETE: delete product and all existing variants of it (admin only)
 *
 * API examples
 * - GET /product?productId={id}
 * - GET /product?collectionId={cid}
 * - GET /product?collectionId={cid}&tag={tagName}
 * - GET /product?featured=true
 * - GET /product?collectionId={cid}&favourite=true
 * - GET /product?collectionId={cid}&favourite=true&tag={tagName}
 * - GET /product-tags?collectionId={cid}
 * - POST /product { product: IProduct }
 * - PUT /product { productId: string, product: IProduct }
 * - PUT /product-default-variant { productId: string, defaultVariantId: string }
 * - DELETE /product?productId={id}
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, QueryCommandInput, UpdateItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

import { constructResponse, isAdmin, JsonLike } from '../Helper';
import IProduct from '../../../interface/product/IProduct';
import IProductRecord from '../../../interface/product/IProductRecord';
import Constants from '../../InfrastructureConstants';

const ddb = new DynamoDBClient({});
const PRODUCT_TABLE = process.env.PRODUCT_TABLE;
const VARIANT_TABLE = process.env.VARIANT_TABLE;

function toProductSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function hasDuplicateProductSlugInCollection(collectionId: string, productName: string, excludeProductId?: string): Promise<boolean> {
    const incomingSlug = toProductSlug(productName);
    const existingProductsRaw = await queryAll({
        TableName: PRODUCT_TABLE,
        IndexName: Constants.productGSINameOnCollectionId,
        KeyConditionExpression: 'collectionId = :cid',
        ExpressionAttributeValues: marshall({ ':cid': collectionId })
    });

    return existingProductsRaw
        .map((item) => normalizeProductRecord(unmarshall(item) as IProductRecord))
        .some((item) => item.productId !== excludeProductId && toProductSlug(item.name) === incomingSlug);
}

function normalizeTags(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    const normalized = input
        .filter((t) => typeof t === 'string')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);
    return Array.from(new Set(normalized));
}

async function queryAll(params: QueryCommandInput) {
    const all: any[] = [];
    let lastKey: Record<string, any> | undefined = undefined;
    do {
        const resp = await ddb.send(new QueryCommand({
            ...params,
            ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
        }));
        all.push(...(resp.Items || []));
        lastKey = resp.LastEvaluatedKey as any;
    } while (lastKey);
    return all;
}

function generateProductFromInput(input: any): IProduct | null {
    function isValidItem(input: any): input is Partial<IProduct> & Pick<IProduct, 'name' | 'fields' | 'imageUrls'> {
        if (!input || typeof input !== 'object') return false;
        if (typeof input.name !== 'string') return false;
        if (typeof input.description !== 'undefined' && typeof input.description !== 'string') return false;
        if (typeof input.collectionId !== 'undefined' && typeof input.collectionId !== 'string') return false;
        if (typeof input.defaultVariantId !== 'undefined' && typeof input.defaultVariantId !== 'string') return false;
        if (typeof (input as any).tags !== 'undefined') {
            const tags = (input as any).tags;
            if (!Array.isArray(tags)) return false;
            if (tags.some((t: any) => typeof t !== 'string')) return false;
        }
        if (typeof input.featured !== 'undefined' && input.featured !== 'true' && input.featured !== 'false') return false;
        const featuredStrength = (input as any).featuredStrength;
        if (typeof featuredStrength !== 'undefined' && typeof featuredStrength !== 'number') return false;
        const fav = (input as any).favourite;
        if (typeof fav !== 'undefined' && fav !== 'true' && fav !== 'false') return false;
        const strength = (input as any).favouriteStrength;
        if (typeof strength !== 'undefined' && typeof strength !== 'number') return false;
        if (!Array.isArray(input.fields)) return false;
        if (!Array.isArray(input.imageUrls)) return false;
        return true;
    }
    if (!isValidItem(input)) {
        return null;
    }
    const favourite = (input as any).favourite;
    const favouriteStrengthRaw = (input as any).favouriteStrength;
    const favouriteNormalized = favourite === 'true' ? 'true' : 'false';
    const favouriteStrength = favouriteNormalized === 'true' && Number.isFinite(favouriteStrengthRaw)
        ? Math.max(0, favouriteStrengthRaw)
        : 0;
    
    const featured = (input as any).featured;
    const featuredStrengthRaw = (input as any).featuredStrength;
    const featuredNormalized = featured === 'true' ? 'true' : 'false';
    const featuredStrength = featuredNormalized === 'true' && Number.isFinite(featuredStrengthRaw)
        ? Math.max(0, featuredStrengthRaw)
        : 0;

    return {
        name: input.name,
        featured: featuredNormalized,
        featuredStrength,
        favourite: favouriteNormalized,
        favouriteStrength,
        tags: normalizeTags((input as any).tags),
        fields: input.fields,
        imageUrls: input.imageUrls,
        ...(typeof input.collectionId === 'string' ? { collectionId: input.collectionId } : {}),
        ...(typeof input.description === 'string' ? { description: input.description } : {}),
        ...(typeof input.defaultVariantId === 'string' ? { defaultVariantId: input.defaultVariantId } : {})
    };
}

function normalizeProductRecord(record: any): IProductRecord {
    const favourite = record?.favourite ?? record?.favourites;
    const rawFavouriteStrength = typeof record?.favouriteStrength === 'number' ? record.favouriteStrength : 0;
    const favouriteNormalized = favourite === 'true' ? 'true' : 'false';

    const rawFeaturedStrength = typeof record?.featuredStrength === 'number' ? record.featuredStrength : 0;
    
    return {
        ...record,
        featured: record?.featured === 'true' ? 'true' : 'false',
        featuredStrength: record?.featured === 'true' && Number.isFinite(rawFeaturedStrength) ? Math.max(0, rawFeaturedStrength) : 0,
        favourite: favouriteNormalized,
        favouriteStrength: favouriteNormalized === 'true' && Number.isFinite(rawFavouriteStrength) ? Math.max(0, rawFavouriteStrength) : 0,
        tags: normalizeTags(record?.tags),
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

                    if (!product.collectionId) {
                        return constructResponse(400, { message: 'collectionId is required to update a product' });
                    }

                    const hasDuplicateSlug = await hasDuplicateProductSlugInCollection(product.collectionId, product.name, productId);
                    if (hasDuplicateSlug) {
                        return constructResponse(409, { message: `A product named "${product.name}" already exists in this collection.` });
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
                const tag = qs.tag;

                const path = (event.path || event.resource || '').toLowerCase();
                if (path.includes('product-tags')) {
                    if (!collectionId) {
                        return constructResponse(400, { message: 'Missing collectionId' });
                    }
                    const itemsRaw = await queryAll({
                        TableName: PRODUCT_TABLE,
                        IndexName: Constants.productGSINameOnCollectionId,
                        KeyConditionExpression: 'collectionId = :cid',
                        ExpressionAttributeValues: marshall({ ':cid': collectionId })
                    });
                    const tags = new Set<string>();
                    for (const item of itemsRaw) {
                        const record = normalizeProductRecord(unmarshall(item) as IProductRecord);
                        for (const t of record.tags ?? []) {
                            tags.add(t);
                        }
                    }
                    return constructResponse(200, Array.from(tags).sort());
                }

                if (productId) {
                    const resp = await ddb.send(new GetItemCommand({
                        TableName: PRODUCT_TABLE,
                        Key: marshall({ productId })
                    }));
                    const item = resp.Item ? normalizeProductRecord(unmarshall(resp.Item) as IProductRecord) : undefined;
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
                    const items = (queryResp.Items || []).map(i => normalizeProductRecord(unmarshall(i) as IProductRecord));
                    return constructResponse(200, items);
                }

                // Favourite products within a specific collection
                if (collectionId && favourite) {
                    if (favourite !== 'true') {
                        return constructResponse(400, { message: 'favourite must be true' });
                    }
                    const itemsRaw = await queryAll({
                        TableName: PRODUCT_TABLE,
                        IndexName: Constants.productGSINameOnCollectionFavourite,
                        KeyConditionExpression: 'collectionId = :cid AND favourite = :fav',
                        ExpressionAttributeValues: marshall({ ':cid': collectionId, ':fav': 'true' })
                    });
                    let items = itemsRaw.map(i => normalizeProductRecord(unmarshall(i) as IProductRecord));
                    if (typeof tag === 'string' && tag.trim()) {
                        const tagNorm = tag.trim().toLowerCase();
                        items = items.filter(p => (p.tags ?? []).includes(tagNorm));
                    }
                    return constructResponse(200, items);
                }

                if (collectionId) {
                    const itemsRaw = await queryAll({
                        TableName: PRODUCT_TABLE,
                        IndexName: Constants.productGSINameOnCollectionId,
                        KeyConditionExpression: 'collectionId = :cid',
                        ExpressionAttributeValues: marshall({ ':cid': collectionId })
                    });
                    let items = itemsRaw.map(i => normalizeProductRecord(unmarshall(i) as IProductRecord));
                    if (typeof tag === 'string' && tag.trim()) {
                        const tagNorm = tag.trim().toLowerCase();
                        items = items.filter(p => (p.tags ?? []).includes(tagNorm));
                    }
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
                if (!product.collectionId) {
                    return constructResponse(400, { message: 'collectionId is required to create a product' });
                }

                const hasDuplicateSlug = await hasDuplicateProductSlugInCollection(product.collectionId, product.name);

                if (hasDuplicateSlug) {
                    return constructResponse(409, { message: `A product named "${product.name}" already exists in this collection.` });
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
