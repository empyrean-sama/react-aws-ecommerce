/**
 * Collections Lambda function
 *
 * Admin-only write operations and open-to-authenticated read list.
 * - GET: returns all collections as ICollectionRecord[] (non-admin allowed)
 * - POST: create a new collection (admin only)
 * - PUT: update an existing collection (admin only)
 * - DELETE: delete a collection (admin only)
 *
 * API
 * - GET /collection - list all collections (ICollectionRecord[])
 * - GET /collection?favourite=true - list all favourite collections
 * - POST /collection - create (body: { collection: ICollection })
 * - PUT /collection - update (body: { collectionId: string, collection: ICollection })
 * - PATCH /collection - update favourite status (body: { collectionId: string, favourite: boolean })
 * - DELETE /collection?collectionId={id} - delete by id
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand, GetItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

import { constructResponse, isAdmin, JsonLike } from '../Helper';
import ICollection from '../../../interface/product/ICollection';
import ICollectionRecord from '../../../interface/product/ICollectionRecord';

const ddb = new DynamoDBClient({});
const COLLECTION_TABLE = process.env.COLLECTION_TABLE;
const COLLECTION_FAVOURITE_INDEX = process.env.COLLECTION_FAVOURITE_INDEX;

function getCollectionFromInput(input: any): ICollection | null {
    function isValidCollection(input: any): input is ICollection {
        return !!input && typeof input.name === 'string' && typeof input.description === 'string';
    }

    if (!isValidCollection(input)) {
        return null;
    }
    return {
        name: input.name,
        description: input.description,
        favourite: input.favourite === 'true' ? 'true' : 'false',
    };
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!COLLECTION_TABLE) {
            console.error('Collection: COLLECTION_TABLE env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        const method = (event.httpMethod || '').toUpperCase();
        switch (method) {
            case 'GET': {
                // List all collections; open to any user
                let items: ICollectionRecord[] = [];
                if (event.queryStringParameters?.collectionId) {
                    const collectionId = event.queryStringParameters.collectionId;
                    const getResp = await ddb.send(new GetItemCommand({
                        TableName: COLLECTION_TABLE,
                        Key: marshall({ collectionId })
                    }));
                    if (!getResp.Item) {
                        return constructResponse(404, { message: 'Collection not found' });
                    }
                    return constructResponse(200, unmarshall(getResp.Item) as ICollectionRecord);
                }
                if (event.queryStringParameters?.favourite === 'true') {
                    if (!COLLECTION_FAVOURITE_INDEX) {
                        console.error('Collection: COLLECTION_FAVOURITE_INDEX env var not set');
                        return constructResponse(500, { message: 'Server configuration error' });
                    }
                    const queryResp = await ddb.send(new QueryCommand({
                        TableName: COLLECTION_TABLE,
                        IndexName: COLLECTION_FAVOURITE_INDEX,
                        KeyConditionExpression: 'favourite = :f',
                        ExpressionAttributeValues: { ':f': { S: 'true' } }
                    }));
                    items = (queryResp.Items || []).map(i => unmarshall(i) as ICollectionRecord);
                } else {
                    const scanResp = await ddb.send(new ScanCommand({ TableName: COLLECTION_TABLE }));
                    items = (scanResp.Items || []).map(i => unmarshall(i) as ICollectionRecord);
                }
                return constructResponse(200, items);
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

                const collection = getCollectionFromInput(parsed.collection);
                if (!collection) {
                    return constructResponse(400, { message: 'Invalid collection' });
                }

                const collectionId = randomUUID();
                const record: ICollectionRecord = { collectionId, ...collection };
                await ddb.send(new PutItemCommand({ TableName: COLLECTION_TABLE, Item: marshall(record) }));
                return constructResponse(201, { message: 'Collection created', collection: record });
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
                const collectionId = typeof parsed.collectionId === 'string' ? parsed.collectionId : '';
                const collection = getCollectionFromInput(parsed.collection);
                if (!collectionId) {
                    return constructResponse(400, { message: 'Missing collectionId' });
                }
                if (!collection) {
                    return constructResponse(400, { message: 'Invalid collection' });
                }

                // Ensure the collection exists
                const existing = await ddb.send(new GetItemCommand({ TableName: COLLECTION_TABLE, Key: marshall({ collectionId }) }));
                if (!existing.Item) {
                    return constructResponse(404, { message: `Collection with id ${collectionId} not found` });
                }

                const record: ICollectionRecord = { collectionId, ...collection };
                await ddb.send(new PutItemCommand({ TableName: COLLECTION_TABLE, Item: marshall(record) }));
                return constructResponse(200, { message: 'Collection updated', collection: record });
            }
            case 'PATCH': {
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
                const collectionId = typeof parsed.collectionId === 'string' ? parsed.collectionId : '';
                const favourite = typeof parsed.favourite === 'boolean' ? parsed.favourite : undefined;

                if (!collectionId) {
                    return constructResponse(400, { message: 'Missing collectionId' });
                }
                if (favourite === undefined) {
                    return constructResponse(400, { message: 'Missing favourite status' });
                }

                // Ensure the collection exists
                const existing = await ddb.send(new GetItemCommand({ TableName: COLLECTION_TABLE, Key: marshall({ collectionId }) }));
                if (!existing.Item) {
                    return constructResponse(404, { message: `Collection with id ${collectionId} not found` });
                }

                await ddb.send(new UpdateItemCommand({
                    TableName: COLLECTION_TABLE,
                    Key: marshall({ collectionId }),
                    UpdateExpression: 'SET favourite = :f',
                    ExpressionAttributeValues: { ':f': { S: favourite ? 'true' : 'false' } }
                }));

                return constructResponse(200, { message: 'Collection updated', collectionId, favourite });
            }
            case 'DELETE': {
                if (!isAdmin(event)) {
                    return constructResponse(403, { message: 'Forbidden' });
                }

                const collectionId = event.queryStringParameters?.collectionId;
                if (!collectionId) {
                    return constructResponse(400, { message: 'Missing collectionId in query' });
                }

                const existing = await ddb.send(new GetItemCommand({ TableName: COLLECTION_TABLE, Key: marshall({ collectionId }) }));
                if (!existing.Item) {
                    return constructResponse(404, { message: 'Collection not found' });
                }
                
                await ddb.send(new DeleteItemCommand({ TableName: COLLECTION_TABLE, Key: marshall({ collectionId }) }));
                return constructResponse(200, { message: 'Collection deleted', collectionId });
            }
            default:
                return constructResponse(405, { message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Collection handler error:', error);
        return constructResponse(500, { message: 'Internal Server Error' });
    }
}
