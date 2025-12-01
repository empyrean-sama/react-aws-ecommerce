/**
 * Address Lambda function
 *
 * Supports GET, POST, DELETE for a user's addresses stored on the Address table.
 * - GET: returns all addresses for the given userId or a specific address if addressId is provided, both userId and addressId are to be provided for address fetch from addressId
 * - POST: adds a new address for the given userId, returns the newly added address id
 * - PUT: updates an existing address with the addressId (returns error if addressId not found)
 * - DELETE: removes an address with the addressId
 *
 * Authorization: only the account owner (sub == userId) or users in the 'admin' group.
 *
 * Input: API Gateway event with Cognito authorizer claims
 * Output: APIGatewayProxyResult with JSON body
 * 
 * API
 * - GET /address?userId={userId} - fetch all addresses for userId
 * - GET /address?addressId={addressId} - fetch specific address by addressId
 * - POST /address - add new address (body: { userId: string, address: IAddress })
 * - PUT /address - update existing address (body: { addressId: string, address: IAddress })
 * - DELETE /address?addressId={addressId} - delete address by addressId
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand, QueryCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { constructResponse, isAuthorized, JsonLike } from '../Helper';
import { getAddressFromJSONLike } from './ProfileHelper';
import Constants from '../../InfrastructureConstants';

import { randomUUID } from 'crypto';
import IAddressRecord from '../../../interface/IAddressRecord';

// Create the DynamoDB client
const dynamoDbClient = new DynamoDBClient({});

// The name of the DynamoDB table for profiles, from environment variables
const ADDRESS_TABLE = process.env.ADDRESS_TABLE;

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if(!ADDRESS_TABLE) {
            console.error('HandleAddress: ADDRESS_TABLE env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const method = event.httpMethod?.toUpperCase();
        switch(method) {
            case 'GET': {
                const addressId = event.queryStringParameters?.addressId;
                const userId = event.queryStringParameters?.userId;

                if(addressId) {
                    // Fetch specific address by addressId
                    const resp = await dynamoDbClient.send(new GetItemCommand({
                        TableName: ADDRESS_TABLE,
                        Key: marshall({ addressId }),
                    }));
                    const item = resp.Item ? unmarshall(resp.Item) : undefined;
                    if(!item) {
                        return constructResponse(404, { message: 'Address not found' });
                    }
                    if(isAuthorized(event, item.userId) === false) {
                        return constructResponse(403, { message: 'Forbidden' });
                    }
                    return constructResponse(200, item);
                } 
                else if(userId) {
                    
                    // Check if authorized to get addresses for this userId
                    if(!isAuthorized(event, userId)) {
                        return constructResponse(403, { message: 'Forbidden' });
                    }

                    // fetch all addresses for userId
                    const addresses = await dynamoDbClient.send(new QueryCommand({
                        TableName: ADDRESS_TABLE,
                        IndexName: Constants.addressGSINameOnUserId,
                        KeyConditionExpression: 'userId = :uid',
                        ExpressionAttributeValues: marshall({ ':uid': userId }),
                    }));
                    const items = addresses.Items ? addresses.Items.map(item => unmarshall(item)) : [];
                    return constructResponse(200, { userId, addresses: items });
                }
                else {
                    return constructResponse(400, { message: 'Missing userId or addressId in query' });
                }
            }
            case 'POST': {
                let parsed: JsonLike = {};
                if (event.body) {
                    try {
                        parsed = JSON.parse(event.body);
                    } catch {
                        return constructResponse(400, { message: 'Invalid JSON body' });
                    }
                }
                const userId = parsed.userId as string | undefined;
                if (!userId) {
                    return constructResponse(400, { message: 'Missing userId' });
                }
                if (!isAuthorized(event, userId)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
               
                const parsedAddress = parsed.address as JsonLike | undefined;
                const address = getAddressFromJSONLike(parsedAddress);
                if (!address) {
                    return constructResponse(400, { message: 'Invalid address' });
                }

                const addressId = randomUUID();
                const addressRecord: IAddressRecord = { ...address, userId, addressId };
                
                // Add the new address record to the ADDRESS_TABLE
                await dynamoDbClient.send(new PutItemCommand({
                    TableName: ADDRESS_TABLE,
                    Item: marshall(addressRecord),
                }));
                return constructResponse(201, { message: 'Address added', userId, addressRecord } );
            }
            case 'PUT': {
                let parsed: JsonLike = {};
                if (event.body) {
                    try {
                        parsed = JSON.parse(event.body);
                    } catch {
                        return constructResponse(400, { message: 'Invalid JSON body' });
                    }
                }
                const addressId = parsed.addressId as string | undefined;
                if (!addressId) {
                    return constructResponse(400, { message: 'Missing addressId' });
                }
                const parsedAddress = parsed.address as JsonLike | undefined;
                const address = getAddressFromJSONLike(parsedAddress);
                if (!address) {
                    return constructResponse(400, { message: 'Invalid address' });
                }
                // Fetch existing address to verify ownership
                const existingResp = await dynamoDbClient.send(new GetItemCommand({
                    TableName: ADDRESS_TABLE,
                    Key: marshall({ addressId }),
                }));
                const existingItem = existingResp.Item ? unmarshall(existingResp.Item) : undefined;
                if(!existingItem) {
                    return constructResponse(404, { message: 'Address not found' });
                }
                const userId = existingItem.userId;
                if (!isAuthorized(event, userId)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
                const updatedAddressRecord: IAddressRecord = { ...address, userId, addressId };
                
                // Update the address record in the ADDRESS_TABLE
                await dynamoDbClient.send(new PutItemCommand({
                    TableName: ADDRESS_TABLE,
                    Item: marshall(updatedAddressRecord),
                }));
                return constructResponse(200, { message: 'Address updated', userId, addressRecord: updatedAddressRecord });
            }
            case 'DELETE': {
                const addressId = event.queryStringParameters?.addressId;
                if(!addressId) {
                    return constructResponse(400, { message: 'Missing addressId in query' });
                }
                // Fetch existing address to verify ownership
                const existingResp = await dynamoDbClient.send(new GetItemCommand({
                    TableName: ADDRESS_TABLE,
                    Key: marshall({ addressId }),
                }));
                const existingItem = existingResp.Item ? unmarshall(existingResp.Item) : undefined;
                if(!existingItem) {
                    return constructResponse(404, { message: 'Address not found' });
                }
                const userId = existingItem.userId;
                if (!isAuthorized(event, userId)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }
                // Delete the address record from the ADDRESS_TABLE
                await dynamoDbClient.send(new DeleteItemCommand({
                    TableName: ADDRESS_TABLE,
                    Key: marshall({ addressId }),
                }));
                return constructResponse(200, { message: 'Address deleted', userId });
            }
            default:
                return constructResponse(405, { message: 'Method Not Allowed' });
        }
    }
    catch (error) {
		console.error('HandleAddress error:', error);
		return constructResponse(500, { message: 'Internal Server Error' });
	}
}