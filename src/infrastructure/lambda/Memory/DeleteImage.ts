/**
 * Delete an image from S3.
 *
 * Requirements:
 * - Caller must be an admin (Cognito group 'admin').
 *
 * Input (DELETE JSON): { key: string } or { url: string }
 * Output: { message: string }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { constructResponse, isAdmin, JsonLike } from '../Helper';

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!BUCKET_NAME) {
            console.error('DeleteImage: BUCKET_NAME env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        if (!isAdmin(event)) {
            return constructResponse(403, { message: 'Forbidden' });
        }

        let parsed: JsonLike = {};
        if (event.body) {
            try {
                parsed = JSON.parse(event.body);
            } catch {
                return constructResponse(400, { message: 'Invalid JSON body' });
            }
        }

        let key = parsed.key as string | undefined;

        if (!key) {
            return constructResponse(400, { message: 'Missing key' });
        }

        // Decode URI components in case the key has special characters
        key = decodeURIComponent(key);

        await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }));

        return constructResponse(200, { message: 'Image deleted', key });

    } catch (error: any) {
        console.error('DeleteImage Error:', error);
        return constructResponse(500, { message: 'Internal Server Error', error: error.message });
    }
}
