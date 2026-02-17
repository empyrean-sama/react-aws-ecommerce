import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { constructResponse, isAdmin } from '../Helper';
import IProductRecord from '../../../interface/product/IProductRecord';

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});

const PRODUCT_TABLE = process.env.PRODUCT_TABLE;
const SEARCH_INDEX_BUCKET = process.env.SEARCH_INDEX_BUCKET;
const SEARCH_INDEX_KEY = process.env.SEARCH_INDEX_KEY;

type SearchIndexEntry = {
    productId: string;
    imageUrl: string;
};

type ProductSearchIndexPayload = {
    generatedAt: number;
    productsByName: Record<string, SearchIndexEntry[]>;
    totalProducts: number;
};

function normalizeName(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}

function getFirstImageUrl(product: IProductRecord): string {
    if (!Array.isArray(product.imageUrls) || product.imageUrls.length === 0) {
        return '';
    }
    const firstImage = product.imageUrls.find((url) => typeof url === 'string' && url.trim().length > 0);
    return firstImage?.trim() ?? '';
}

async function scanAllProducts(tableName: string): Promise<IProductRecord[]> {
    const allItems: IProductRecord[] = [];
    let exclusiveStartKey: Record<string, any> | undefined = undefined;

    do {
        const response = await ddb.send(new ScanCommand({
            TableName: tableName,
            ExclusiveStartKey: exclusiveStartKey,
        }));

        for (const raw of response.Items ?? []) {
            allItems.push(unmarshall(raw) as IProductRecord);
        }

        exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return allItems;
}

function buildSearchIndex(products: IProductRecord[]): ProductSearchIndexPayload {
    const byName: Record<string, SearchIndexEntry[]> = {};

    for (const product of products) {
        const productName = normalizeName(product.name);
        if (!productName || typeof product.productId !== 'string' || !product.productId.trim()) {
            continue;
        }

        if (!byName[productName]) {
            byName[productName] = [];
        }

        byName[productName].push({
            productId: product.productId,
            imageUrl: getFirstImageUrl(product),
        });
    }

    return {
        generatedAt: Date.now(),
        productsByName: byName,
        totalProducts: Object.values(byName).reduce((total, entries) => total + entries.length, 0),
    };
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const method = (event.httpMethod || '').toUpperCase();
        if (method !== 'POST') {
            return constructResponse(405, { message: 'Method Not Allowed' });
        }

        if (!isAdmin(event)) {
            return constructResponse(403, { message: 'Forbidden' });
        }

        if (!PRODUCT_TABLE || !SEARCH_INDEX_BUCKET || !SEARCH_INDEX_KEY) {
            console.error('SearchIndex: Missing environment configuration');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const products = await scanAllProducts(PRODUCT_TABLE);
        const indexPayload = buildSearchIndex(products);

        await s3.send(new PutObjectCommand({
            Bucket: SEARCH_INDEX_BUCKET,
            Key: SEARCH_INDEX_KEY,
            Body: JSON.stringify(indexPayload),
            ContentType: 'application/json',
            CacheControl: 'no-store, no-cache, must-revalidate, max-age=0',
        }));

        return constructResponse(200, {
            message: 'Search index regenerated successfully',
            objectKey: SEARCH_INDEX_KEY,
            totalProducts: indexPayload.totalProducts,
            generatedAt: indexPayload.generatedAt,
        });
    } catch (error) {
        console.error('SearchIndex handler error:', error);
        return constructResponse(500, { message: 'Internal Server Error' });
    }
}
