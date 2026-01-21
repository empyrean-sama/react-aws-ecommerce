/**
 * Lambda used to manage lists of data stored in S3, this type of data is useful for writing once and reading many times without performing much of an operation.
 ** All lists are stored as JSON files in S3, with the key provided as a query parameter. 
 *
 * Admin-only write operations and open to all read operations.
 * GET: returns all the list contents as a Record<string, any> (parsed from JSON)
 * PUT: (admin only) replaces the list contents with the provided body (must be valid JSON)
 * DELETE: (admin only) deletes the list (S3 object)
 * 
 * API
 * - GET /list?key={key} - retrieves the list stored at the specified key
 * - PUT /list?key={key} - (admin only) updates the list stored at the specified key with the provided JSON body
 * - DELETE /list?key={key} - (admin only) deletes the list stored at the specified key
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Readable } from "stream";
import { constructResponse, isAdmin, JsonLike, streamToString } from '../Helper';

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

export const Handle = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!BUCKET_NAME) {
            console.error('ManageLists: BUCKET_NAME env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }
        const key = event.queryStringParameters?.key;
        if(!key) {
            return constructResponse(400, { message: "Missing 'key' query parameter" });
        }

        const method = event.httpMethod;
        if (method === 'GET') {
            const command = new GetObjectCommand({Bucket: BUCKET_NAME, Key: key});
            try {
                const response = await s3.send(command);
                const bodyContents = await streamToString(response.Body as Readable);
                const parsedBody: JsonLike = JSON.parse(bodyContents);
                return constructResponse(200, parsedBody);
            }
            catch (error: any) {
                if (error.name === 'NoSuchKey') {
                    console.warn(`ManageLists: Key ${key} not found, returning an empty list`);
                    return constructResponse(200, []);
                }
                throw error; // TODO: improve error handling, see if the file is not JSON, corrupted or other issues
            }
        }
        else if (method === 'PUT' || method === 'DELETE') {
            if (!isAdmin(event)) {
                return constructResponse(403, { message: "Forbidden: Admins only" });
            }
            if (method === 'PUT') {
                if (!event.body) {
                    return constructResponse(400, { message: "Missing request body" });
                }
                let parsedBody: JsonLike;
                try {
                    parsedBody = JSON.parse(event.body);
                    if(!Array.isArray(parsedBody)) {
                        return constructResponse(400, { message: "Request body must be a valid array" });
                    }

                } catch (e) {
                    return constructResponse(400, { message: "Invalid JSON body" });
                }
                const command = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                    Body: JSON.stringify(parsedBody),
                    ContentType: "application/json",
                    CacheControl: "max-age=60, stale-while-revalidate=300" // Cache for 1 minute, allow stale for 5
                });
                await s3.send(command);
                return constructResponse(200, { message: "List saved successfully" });
            }
            else {
                const deleteCommand = new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                    Body: '',
                    ContentType: "application/json",
                    CacheControl: "max-age=0" // Invalidate cache immediately
                });
                await s3.send(deleteCommand);
                return constructResponse(200, { message: "List deleted successfully" });
            }
        }
        return constructResponse(405, { message: "Method Not Allowed" });
    }
    catch (error: any) {
        console.error(error);
        return constructResponse(500, { message: "Internal Server Error" });
    }
}