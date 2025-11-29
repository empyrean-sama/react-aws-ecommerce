/**
 * HandleAddress Lambda function
 *
 * Supports GET, POST, DELETE for a user's addresses stored as a String Set in the profiles table.
 * - GET: returns all addresses for the given userId
 * - POST: adds a new address to the addresses set for the given userId
 * - DELETE: removes an address from the addresses set for the given userId
 *
 * Authorization: only the account owner (sub == userId) or users in the 'admin' group.
 *
 * Input: API Gateway event with Cognito authorizer claims
 * Output: APIGatewayProxyResult with JSON body
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { constructResponse, getClaim, isAuthorized, JsonLike } from './Helper';

// Create the DynamoDB client
const dynamoDbClient = new DynamoDBClient({});

// The name of the DynamoDB table for profiles, from environment variables
const PROFILES_TABLE = process.env.PROFILES_TABLE;

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
	try {
		if (!PROFILES_TABLE) {
			console.error('HandleAddress: PROFILES_TABLE env var not set');
			return constructResponse(500, { message: 'Server configuration error' });
		}

		const method = event.httpMethod?.toUpperCase();
		if (!method || !['GET', 'POST', 'DELETE'].includes(method)) {
			return constructResponse(405, { message: 'Method Not Allowed' });
		}

		if (method === 'GET') {
			const userId = event.queryStringParameters?.userId;
			if (!userId) {
                return constructResponse(400, { message: 'Missing userId in query' });
            }
			if (!isAuthorized(event, userId)) {
                return constructResponse(403, { message: 'Forbidden' });
            }

			const resp = await dynamoDbClient.send(new GetItemCommand({
				TableName: PROFILES_TABLE,
				Key: marshall({ userId }),
				ProjectionExpression: 'addresses',
			}));

			const item = resp.Item ? unmarshall(resp.Item) : undefined;
			const addresses: string[] = Array.isArray(item?.addresses)
				? item.addresses
				: ((resp.Item as any)?.addresses?.SS ?? []); //TODO: probably not needed

			return constructResponse(200, { userId, addresses });
		}

		let parsed: JsonLike = {};
		if (event.body) {
			try {
				parsed = JSON.parse(event.body);
			} catch {
				return constructResponse(400, { message: 'Invalid JSON body' });
			}
		}

		const userId = parsed.userId as string | undefined;
		const address = parsed.address as string | undefined;
		if (!userId) {
            return constructResponse(400, { message: 'Missing userId' });
        }
		if (!isAuthorized(event, userId)) {
            return constructResponse(403, { message: 'Forbidden' });
        }

		if (method === 'POST') {
			if (!address || typeof address !== 'string' || !address.trim()) {
				return constructResponse(400, { message: 'Missing or invalid address' });
			}

			await dynamoDbClient.send(new UpdateItemCommand({
				TableName: PROFILES_TABLE,
				Key: marshall({ userId }),
				UpdateExpression: 'ADD addresses :addrSet',
				ExpressionAttributeValues: {
					':addrSet': { SS: [address] },
				},
				ReturnValues: 'UPDATED_NEW',
			}));

			return constructResponse(200, { message: 'Address added', userId, address });
		}

		if (method === 'DELETE') {
			if (!address || typeof address !== 'string' || !address.trim()) {
				return constructResponse(400, { message: 'Missing or invalid address' });
			}

			await dynamoDbClient.send(new UpdateItemCommand({
				TableName: PROFILES_TABLE,
				Key: marshall({ userId }),
				UpdateExpression: 'DELETE addresses :addrSet',
				ExpressionAttributeValues: {
					':addrSet': { SS: [address] },
				},
				ReturnValues: 'UPDATED_NEW',
			}));

			return constructResponse(200, { message: 'Address deleted', userId, address });
		}

		return constructResponse(405, { message: 'Method Not Allowed' });
	} catch (error) {
		console.error('HandleAddress error:', error);
		return constructResponse(500, { message: 'Internal Server Error' });
	}
}