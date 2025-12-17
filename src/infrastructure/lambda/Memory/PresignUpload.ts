/**
 * Generate a presigned URL (PUT) for uploading an image to S3.
 *
 * Requirements:
 * - Caller must be an admin (Cognito group 'admin').
 * - Enforce reasonable size (default from env MAX_IMAGE_BYTES, else 5MB).
 * - Enforce image Content-Type and require Content-MD5 for exact file integrity.
 * - Generate a safe S3 object key; do not trust client for to decide on a file path.
 *
 * Input (POST JSON): { fileName: string, contentType: string, contentMd5: string, contentLength: number }
 * Output: { uploadUrl, bucket, key, expiresIn, requiredHeaders: { 'Content-Type', 'Content-MD5' } }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import Constants from '../../../Constants';

import { constructResponse, isAdmin, JsonLike } from '../Helper';

const s3 = new S3Client({});

const BUCKET_NAME = process.env.BUCKET_NAME;
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES);

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function extFromMime(ct: string): string {
    let extension = "";
    switch (ct) {
        case 'image/jpeg':
            extension = 'jpg';
            break; 
        case 'image/png':
            extension = 'png';
            break;
        case 'image/webp':
            extension = 'webp';
            break;
        case 'image/avif':
            extension = 'avif';
            break;
        default:
            throw new Error('Unsupported content type');
    }
    return extension;
}

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!BUCKET_NAME) {
            console.error('PresignUpload: BUCKET_NAME env var not set');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        if(!MAX_IMAGE_BYTES || isNaN(MAX_IMAGE_BYTES) || MAX_IMAGE_BYTES <= 0) {
            console.error('PresignUpload: Invalid MAX_IMAGE_BYTES env var');
            return constructResponse(500, { message: 'Server configuration error' });
        }

        if (!isAdmin(event)) {
            return constructResponse(403, { message: 'Forbidden' });
        }

        if (event.httpMethod?.toUpperCase() !== 'POST') {
            return constructResponse(405, { message: 'Method Not Allowed' });
        }

        let body: JsonLike = {};
        if (event.body) {
            try {
                body = JSON.parse(event.body);
            } catch {
                return constructResponse(400, { message: 'Invalid JSON body' });
            }
        }

        const fileName = typeof body.fileName === 'string' ? body.fileName : '';
        const contentType = typeof body.contentType === 'string' ? body.contentType : '';
        const contentMd5 = typeof body.contentMd5 === 'string' ? body.contentMd5 : '';
        const contentLength = Number(body.contentLength);

        if (!fileName) return constructResponse(400, { message: 'Missing fileName' });
        if (!contentType) return constructResponse(400, { message: 'Missing contentType' });
        if (!contentMd5) return constructResponse(400, { message: 'Missing contentMd5 (base64 of MD5 digest)' });
        if (!Number.isFinite(contentLength) || contentLength <= 0) {
            return constructResponse(400, { message: 'Invalid contentLength' });
        }

        if (!Constants.IMAGE_UPLOAD_ALLOWED_TYPES.includes(contentType)) {
            return constructResponse(400, { message: 'Unsupported Content-Type' });
        }
        if (contentLength > MAX_IMAGE_BYTES) {
            return constructResponse(400, { message: `File too large. Max ${MAX_IMAGE_BYTES} bytes` });
        }

        const safeName = sanitizeFileName(fileName);
        const ext = extFromMime(contentType);
        const key = `uploads/images/${new Date().toISOString().slice(0,10)}/${randomUUID()}-${safeName}.${ext}`;

        // Prepare a signed PUT URL that binds Content-Type and Content-MD5
        const put = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
            ContentMD5: contentMd5,
        });
        // Keeping expiry short; adjust if needed (max ~7 days)
        const expiresIn = 300; // seconds
        const uploadUrl = await getSignedUrl(s3, put, { expiresIn });

        return constructResponse(200, {
            uploadUrl,
            bucket: BUCKET_NAME,
            key,
            expiresIn,
            requiredHeaders: {
                'Content-Type': contentType,
                'Content-MD5': contentMd5,
            },
            maxBytes: MAX_IMAGE_BYTES,
        });
    } catch (error) {
        console.error('PresignUpload error:', error);
        return constructResponse(500, { message: 'Internal Server Error' });
    }
}
