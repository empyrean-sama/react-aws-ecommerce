/**
 * Reviews Lambda function
 *
 * Handles product review retrieval, eligibility checks, averages, and write operations.
 * - GET /review?productId={id} (public): list reviews for one product
 * - GET /review-average?productId={id}|productIds={id1,id2,...} (public): average score(s)
 * - GET /review-eligibility?productId={id} (authenticated): whether caller can submit a review
 * - POST /review (authenticated): create review (admin unlimited; non-admin one review per eligible order)
 * - PUT /review (authenticated): update review (admin or owner, with purchase/admin eligibility)
 * - DELETE /review?reviewId={id} (authenticated): delete review (admin or owner, with purchase/admin eligibility)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

import { constructResponse, getClaim, isAdmin } from '../Helper';
import IReview from '../../../interface/product/IReview';
import IReviewRecord from '../../../interface/product/IReviewRecord';
import Constants from '../../InfrastructureConstants';

const ddb = new DynamoDBClient({});
const REVIEW_TABLE = process.env.REVIEW_TABLE;
const ORDERS_TABLE = process.env.ORDERS_TABLE;

const ONE_MONTH_IN_MS = 2_592_000_000;

type IReviewInput = Omit<IReview, 'userId' | 'orderReference' | 'reviewerName' | 'reviewerUsername'>;
type IReviewEligibilityResult = { canSubmit: boolean; reason?: string; nextOrderReference?: string };
type IReviewAverageResult = { productId: string; averageScore: number; reviewCount: number };

function generateReviewFromInput(input: any): IReviewInput | null {
    if (!input || typeof input !== 'object') return null;
    if (typeof input.productId !== 'string' || input.productId.trim().length === 0) return null;
    if (typeof input.title !== 'string' || input.title.trim().length === 0) return null;
    if (typeof input.text !== 'string' || input.text.trim().length === 0) return null;
    if (typeof input.starRating !== 'number' || !Number.isInteger(input.starRating)) return null;
    if (input.starRating < 1 || input.starRating > 5) return null;

    return {
        productId: input.productId.trim(),
        title: input.title.trim(),
        text: input.text.trim(),
        starRating: input.starRating,
    };
}

async function getRecentOrderReferencesForProduct(userId: string, productId: string): Promise<string[]> {
    if (!ORDERS_TABLE) {
        return [];
    }

    const now = Date.now();
    const oneMonthAgo = now - ONE_MONTH_IN_MS;

    const response = await ddb.send(new QueryCommand({
        TableName: ORDERS_TABLE,
        KeyConditionExpression: 'userId = :uid AND createdAt >= :createdAtMin',
        ExpressionAttributeValues: marshall({
            ':uid': userId,
            ':createdAtMin': oneMonthAgo,
        }),
        ScanIndexForward: false,
    }));

    const orders = (response.Items || []).map((item) => unmarshall(item) as { orderId?: string; createdAt?: number; products?: Array<{ productId?: string }> });
    const refs: string[] = [];

    for (const order of orders) {
        const hasProduct = Array.isArray(order.products) && order.products.some((item) => item?.productId === productId);
        if (!hasProduct) {
            continue;
        }

        if (typeof order.orderId === 'string' && order.orderId.trim().length > 0) {
            refs.push(order.orderId.trim());
            continue;
        }

        if (typeof order.createdAt === 'number' && Number.isFinite(order.createdAt)) {
            refs.push(`createdAt:${order.createdAt}`);
        }
    }

    return Array.from(new Set(refs));
}

async function getUserReviewsForProduct(userId: string, productId: string): Promise<IReviewRecord[]> {
    const queryResp = await ddb.send(new QueryCommand({
        TableName: REVIEW_TABLE,
        IndexName: Constants.reviewGSINameOnProductId,
        KeyConditionExpression: 'productId = :pid',
        ExpressionAttributeValues: marshall({ ':pid': productId }),
    }));

    return (queryResp.Items || [])
        .map((item) => unmarshall(item) as IReviewRecord)
        .filter((review) => review.userId === userId);
}

async function getReviewEligibility(event: APIGatewayProxyEvent, userId: string, productId: string): Promise<IReviewEligibilityResult> {
    if (isAdmin(event)) {
        return { canSubmit: true };
    }

    const orderReferences = await getRecentOrderReferencesForProduct(userId, productId);
    if (orderReferences.length === 0) {
        return { canSubmit: false, reason: 'You can review this item only after purchasing it in the last month.' };
    }

    const userReviews = await getUserReviewsForProduct(userId, productId);
    const usedOrderReferences = new Set(
        userReviews
            .map((review) => review.orderReference)
            .filter((reference): reference is string => typeof reference === 'string' && reference.length > 0)
    );

    const nextOrderReference = orderReferences.find((reference) => !usedOrderReferences.has(reference));
    if (!nextOrderReference) {
        return { canSubmit: false, reason: 'You have already left one review for each eligible order.' };
    }

    return { canSubmit: true, nextOrderReference };
}

async function canMutateReview(event: APIGatewayProxyEvent, userId: string, productId: string): Promise<boolean> {
    if (isAdmin(event)) {
        return true;
    }

    // todo: we allow the user to change any review for a product if they have an eligible order reference, maybe we should only allow him to change reviews that are associated with an order reference that has a purchase in the last month?
    const orderReferences = await getRecentOrderReferencesForProduct(userId, productId);
    return orderReferences.length > 0;
}

function buildReviewerIdentity(event: APIGatewayProxyEvent): { reviewerName: string; reviewerUsername: string } {
    const email = getClaim(event, 'email')?.trim();
    const phoneNumber = getClaim(event, 'phone_number')?.trim();
    const preferredUsername = getClaim(event, 'preferred_username')?.trim();
    const givenName = getClaim(event, 'given_name')?.trim();
    const familyName = getClaim(event, 'family_name')?.trim();
    const fullNameClaim = getClaim(event, 'name')?.trim();
    const sub = getClaim(event, 'sub')?.trim() ?? 'unknown-user';

    const reviewerUsername = email || phoneNumber || preferredUsername || sub;
    const reviewerName = fullNameClaim
        || [givenName, familyName].filter(Boolean).join(' ').trim()
        || reviewerUsername;

    return { reviewerName, reviewerUsername };
}

async function getAverageForProduct(productId: string): Promise<IReviewAverageResult | null> {
    const queryResp = await ddb.send(new QueryCommand({
        TableName: REVIEW_TABLE,
        IndexName: Constants.reviewGSINameOnProductId,
        KeyConditionExpression: 'productId = :pid',
        ExpressionAttributeValues: marshall({ ':pid': productId }),
        ProjectionExpression: 'productId, starRating',
    }));

    const rows = (queryResp.Items || [])
        .map((item) => unmarshall(item) as { productId?: string; starRating?: number })
        .filter((row) => typeof row.starRating === 'number' && Number.isFinite(row.starRating));

    if (rows.length === 0) {
        return null;
    }

    const totalScore = rows.reduce((sum, row) => sum + (row.starRating as number), 0);
    return {
        productId,
        averageScore: totalScore / rows.length,
        reviewCount: rows.length,
    };
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!REVIEW_TABLE) {
            console.error('Review: REVIEW_TABLE env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const method = (event.httpMethod || '').toUpperCase();
        const qs = event.queryStringParameters || {};

        if (method === 'GET') {
            const path = (event.path || event.resource || '').toLowerCase();
            const productId = qs.productId;

            if (path.includes(Constants.reviewAverageResourceName.toLowerCase())) {
                const requestedProductIds = [
                    ...(typeof productId === 'string' ? [productId] : []),
                    ...((qs.productIds || '')
                        .split(',')
                        .map((id) => id.trim())
                        .filter(Boolean)),
                ];

                const uniqueProductIds = Array.from(new Set(requestedProductIds));
                if (uniqueProductIds.length === 0) {
                    return constructResponse(400, { message: 'Missing productId or productIds' });
                }

                const averageResults = await Promise.all(uniqueProductIds.map((id) => getAverageForProduct(id)));
                const resolved = averageResults.filter((item): item is IReviewAverageResult => item !== null);
                if (resolved.length === 0) {
                    return constructResponse(404, { message: 'No reviews available to calculate average score' });
                }

                if (uniqueProductIds.length === 1) {
                    return constructResponse(200, resolved[0]);
                }

                return constructResponse(200, resolved);
            }

            if (!productId) {
                return constructResponse(400, { message: 'Missing productId' });
            }

            if (path.includes(Constants.reviewEligibilityResourceName.toLowerCase())) {
                const userId = getClaim(event, 'sub');
                if (!userId) {
                    return constructResponse(401, { message: 'Unauthorized' });
                }
                const eligibility = await getReviewEligibility(event, userId, productId);
                return constructResponse(200, eligibility);
            }

            const queryResp = await ddb.send(new QueryCommand({
                TableName: REVIEW_TABLE,
                IndexName: Constants.reviewGSINameOnProductId,
                KeyConditionExpression: 'productId = :pid',
                ExpressionAttributeValues: marshall({ ':pid': productId }),
                ScanIndexForward: false,
            }));

            const reviews = (queryResp.Items || []).map((item) => unmarshall(item) as IReviewRecord);
            return constructResponse(200, reviews);
        }

        const userId = getClaim(event, 'sub');
        if (!userId) {
            return constructResponse(401, { message: 'Unauthorized' });
        }

        let parsed: { review?: IReview; reviewId?: string } = {};
        if (event.body) {
            try {
                parsed = JSON.parse(event.body);
            } catch {
                return constructResponse(400, { message: 'Invalid JSON body' });
            }
        }

        if (method === 'POST') {
            const review = generateReviewFromInput(parsed.review);
            if (!review) {
                return constructResponse(400, { message: 'Invalid review' });
            }

            const reviewerIdentity = buildReviewerIdentity(event);

            const eligibility = await getReviewEligibility(event, userId, review.productId);
            const isCallerAdmin = isAdmin(event);
            if (!eligibility.canSubmit || (!isCallerAdmin && !eligibility.nextOrderReference)) {
                return constructResponse(403, { message: eligibility.reason || 'You are not eligible to submit a review for this item.' });
            }

            const orderReference = isCallerAdmin
                ? `admin:${randomUUID()}`
                : (eligibility.nextOrderReference as string);

            const now = Date.now();
            const record: IReviewRecord = {
                ...review,
                reviewId: randomUUID(),
                userId,
                orderReference,
                reviewerName: reviewerIdentity.reviewerName,
                reviewerUsername: reviewerIdentity.reviewerUsername,
                createdAt: now,
                updatedAt: now,
            };

            await ddb.send(new PutItemCommand({
                TableName: REVIEW_TABLE,
                Item: marshall(record)
            }));

            return constructResponse(201, { review: record });
        }

        if (method === 'PUT') {
            if (!parsed.reviewId || typeof parsed.reviewId !== 'string') {
                return constructResponse(400, { message: 'Missing reviewId' });
            }

            const review = generateReviewFromInput(parsed.review);
            if (!review) {
                return constructResponse(400, { message: 'Invalid review' });
            }

            const reviewerIdentity = buildReviewerIdentity(event);

            const existingResp = await ddb.send(new GetItemCommand({
                TableName: REVIEW_TABLE,
                Key: marshall({ reviewId: parsed.reviewId })
            }));

            if (!existingResp.Item) {
                return constructResponse(404, { message: 'Review not found' });
            }

            const existing = unmarshall(existingResp.Item) as IReviewRecord;

            if (!isAdmin(event) && existing.userId !== userId) {
                return constructResponse(403, { message: 'You can only update your own reviews.' });
            }

            const authorized = await canMutateReview(event, userId, review.productId);
            if (!authorized) {
                return constructResponse(403, { message: 'Only admins or users who purchased this item in the last month can update reviews.' });
            }

            const updated: IReviewRecord = {
                ...existing,
                ...review,
                reviewId: existing.reviewId,
                userId: existing.userId,
                reviewerName: reviewerIdentity.reviewerName,
                reviewerUsername: reviewerIdentity.reviewerUsername,
                createdAt: existing.createdAt,
                updatedAt: Date.now(),
            };

            await ddb.send(new PutItemCommand({
                TableName: REVIEW_TABLE,
                Item: marshall(updated)
            }));

            return constructResponse(200, { review: updated });
        }

        if (method === 'DELETE') {
            const reviewId = qs.reviewId;
            if (!reviewId) {
                return constructResponse(400, { message: 'Missing reviewId' });
            }

            const existingResp = await ddb.send(new GetItemCommand({
                TableName: REVIEW_TABLE,
                Key: marshall({ reviewId })
            }));

            if (!existingResp.Item) {
                return constructResponse(404, { message: 'Review not found' });
            }

            const existing = unmarshall(existingResp.Item) as IReviewRecord;

            if (!isAdmin(event) && existing.userId !== userId) {
                return constructResponse(403, { message: 'You can only delete your own reviews.' });
            }

            const authorized = await canMutateReview(event, userId, existing.productId);
            if (!authorized) {
                return constructResponse(403, { message: 'Only admins or users who purchased this item in the last month can delete reviews.' });
            }

            await ddb.send(new DeleteItemCommand({
                TableName: REVIEW_TABLE,
                Key: marshall({ reviewId })
            }));

            return constructResponse(200, { message: 'Review deleted' });
        }

        return constructResponse(405, { message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Review handler error:', error);
        return constructResponse(500, { message: 'Internal Server Error' });
    }
}