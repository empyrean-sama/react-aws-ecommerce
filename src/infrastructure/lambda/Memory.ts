/**
 * This lambda is responsible for managing memory on the S3 bucket
 * Public API:
 * - GET /list?key={key} - retrieves the list stored at the specified key
 * 
 * Admin API (requires admin authentication):
 * - POST /gen-presignedUrl - uses the files array (max size MAX_BATCH_ACTIONS) inside the body and returns an array of IPresignUploadOutput
 * - PUT /list?key={key} - updates the list stored at the specified key with the provided JSON body
 * - DELETE /list?key={key} - deletes the list stored at the specified key
 * - DELETE /image?key={key} - deletes an image from S3 based on the provided key in the query parameters
 * - DELETE /image - deletes an image or a list of images from S3 based on the provided 'keys' array in the request body (max size MAX_BATCH_ACTIONS)
 */ 

import { randomUUID } from 'crypto';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { Readable } from "stream";
import { constructResponse, isAdmin, JsonLike, sanitizeFileName, streamToString } from './Helper';

import IPresignUploadInput from '../../interface/IPresignUploadInput';
import IPresignUploadOutput from '../../interface/IPresignUploadOutput';

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES);
const MAX_BATCH_ACTIONS = 10; // Max number of items allowed in batch operations (like multiple image deletions or presigned URL generations) to prevent abuse and ensure performance

export default async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        if (!BUCKET_NAME) {
            throw new Error('Memory lambda: BUCKET_NAME env var not set');
        }
        if (!MAX_IMAGE_BYTES || isNaN(MAX_IMAGE_BYTES) || MAX_IMAGE_BYTES <= 0) {
            throw new Error('Memory lambda: MAX_IMAGE_BYTES env var not set or invalid');
        }

        const httpMethod = event.httpMethod.toUpperCase();
        if(httpMethod === "GET") {
            const key = event.queryStringParameters?.key;
            if(!key) {
                return constructResponse(400, { message: "Missing 'key' query parameter" });
            }
            const command = new GetObjectCommand({Bucket: BUCKET_NAME, Key: key});
            try {
                const response = await s3.send(command);
                const bodyContents = await streamToString(response.Body as Readable);
                const parsedBody: JsonLike = JSON.parse(bodyContents);
                return constructResponse(200, parsedBody);
            }
            catch (error: any) {
                if (error.name === 'NoSuchKey') {
                    console.warn(`Memory lambda: Key ${key} not found, returning an empty list`);
                    return constructResponse(200, []);
                }
                throw error; // TODO: improve error handling, see if the file is not JSON, corrupted or other issues
            }
        }
        
        if(!isAdmin(event)) {
            return constructResponse(403, { message: "Forbidden: Admins only" });
        }
        
        // Generate presigned URL for uploading an image
        if (httpMethod === "POST" && event.path.endsWith("/gen-presignedUrl")) {
            try {
                const body = JSON.parse(event.body || "{}") as JsonLike;
                const files: IPresignUploadInput[] = body.files || [];
                if(!Array.isArray(files)) {
                    throw new Error("files must be an array");
                }
                if(files.length === 0 || files.length > MAX_BATCH_ACTIONS) {
                    throw new Error(`files array must contain between 1 and ${MAX_BATCH_ACTIONS} items`);
                }
                files.forEach(file => {
                    checkIfInputValid(file);
                    file.sanitizedFileName = sanitizeFileName(file.fileName);
                }); // throws if any file is invalid
                const presignedOutputs: IPresignUploadOutput[] = [];
                for(const file of files) {
                    const expiresIn = 300; // seconds
                    const safeName = file.sanitizedFileName as string;
                    const key = `uploads/${randomUUID()}_${safeName.endsWith('.webp') ? safeName : `${safeName}.webp`}`;
                    const putObjectCommand = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: file.contentType, ContentMD5: file.contentMd5 });
                    const uploadUrl = await getSignedUrl(s3, putObjectCommand, { expiresIn });
                    
                    // Cache data so that it can be sent back to the client
                    presignedOutputs.push({ uploadUrl, bucket: BUCKET_NAME, key, expiresIn, requiredHeaders: { 'Content-Type': file.contentType, 'Content-MD5': file.contentMd5 }, maxBytes: MAX_IMAGE_BYTES });
                }
                return constructResponse(200, presignedOutputs);
            }
            catch(error) {
                if(error instanceof Error) {
                    console.error(error.message);
                }
                return constructResponse(400, { message: "Invalid request body" });
            }
        }

        // Update a list stored at the specified key
        if (httpMethod === "PUT" && event.path.startsWith("/list")) {
            const key = event.queryStringParameters?.key;
            try {
                if(!key) {
                    throw new Error("Missing 'key' query parameter");
                }
                if (!event.body) {
                    throw new Error("Missing request body");
                }
                const parsedBody = JSON.parse(event.body);
                if(!Array.isArray(parsedBody)) {
                    throw new Error("Request body must be a valid array");
                }
                const putObjectCommand = new PutObjectCommand({Bucket: BUCKET_NAME, Key: key, Body: JSON.stringify(parsedBody), ContentType: "application/json", CacheControl: "max-age=60, stale-while-revalidate=300" }); // Cache for 1 minute, allow stale for 5
                await s3.send(putObjectCommand);
                return constructResponse(200, { message: "List saved successfully" });
            }
            catch(error) {
                if(error instanceof Error) {
                    console.error(error.message);
                }
                return constructResponse(400, { message: "Invalid request body" });
            }
        }

        // Delete a list stored at the specified key
        if (httpMethod === "DELETE" && event.path.startsWith("/list")) {
            const key = event.queryStringParameters?.key;
            if(!key) {
                console.error("Missing 'key' query parameter");
                return constructResponse(400, { message: "Invalid Request" });
            }
            const deleteCommand = new DeleteObjectCommand({Bucket: BUCKET_NAME, Key: key });
            await s3.send(deleteCommand);
            return constructResponse(200, { message: "List deleted successfully" });
        }

        // Delete an image or a list of images based on the provided 'key' query parameter or 'keys' array in the request body
        if (httpMethod === "DELETE" && event.path.startsWith("/image")) {
            let keys: string[] = [];
            
            const keyFromQuery = event.queryStringParameters?.key;
            if(keyFromQuery) {
                keys.push(keyFromQuery);
            }
            else {
                try {
                    if(!event.body) {
                        throw new Error("Missing request body");
                    }
                    const body = JSON.parse(event.body) as JsonLike;
                    if (Array.isArray(body.keys)) {
                        keys = body.keys.filter((k: any) => typeof k === 'string').map((k: string) => decodeURIComponent(k));
                    }
                    if(keys.length === 0) {
                        throw new Error("No valid keys provided for deletion");
                    }
                    if(keys.length > MAX_BATCH_ACTIONS) {
                        throw new Error(`Too many keys provided for deletion. Max ${MAX_BATCH_ACTIONS} allowed.`);
                    }
                }
                catch(error) {
                    if(error instanceof Error) {
                        console.error(error.message);
                    }
                    return constructResponse(400, { message: "Invalid request body" });
                }
            }

            // Delete objects in parallel
            try {
                await Promise.all(keys.map(key => s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }))));
                return constructResponse(200, { message: "Images deleted successfully", keys });
            }
            catch (error) {
                return constructResponse(500, { message: "1 or more images failed to delete" });
            }
        }

        return constructResponse(404, { message: "Not Found" });
    }
    catch (error: any) {
        console.error('Unhandled exception in Memory lambda: ', error);
        return constructResponse(500, { error: 'Internal server error' });
    }
}

function checkIfInputValid(file: IPresignUploadInput): void {
    if(typeof file.fileName !== 'string' || file.fileName.trim() === '') {
        throw new Error("fileName must be a string");
    }
    if(file.contentType !== "image/webp") {
        throw new Error("contentType must be 'image/webp'");
    }
    if(typeof file.contentMd5 !== 'string' || file.contentMd5.trim() === '') {
        throw new Error("contentMd5 must be a string");
    }
    if(typeof file.contentLength !== 'number' || !Number.isFinite(file.contentLength) || file.contentLength <= 0) {
        throw new Error("contentLength must be a positive number");
    }
    if(file.contentLength > MAX_IMAGE_BYTES) {
        throw new Error(`contentLength must not exceed ${MAX_IMAGE_BYTES} bytes`);
    }
}