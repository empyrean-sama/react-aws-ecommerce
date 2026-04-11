import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Readable } from "stream";

export type JsonLike = { [key: string]: any };

/**
 * Construct a JSON HTTP response for API Gateway
 * @param statusCode number, The HTTP status code for the response
 * @param payload: JsonLike, The JSON payload to include in the response body
 * @returns APIGatewayProxyResult, which can be returned from a Lambda function
 */
export function constructResponse(statusCode: number, payload: JsonLike, 
    corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    }
): APIGatewayProxyResult {
    const response = {
        statusCode,
        headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
        },
        body: JSON.stringify(payload),
    };
    return response;
}

/**
 * Get a claim from the API Gateway event authorizer
 * @param event: APIGatewayProxyEvent, The API Gateway event
 * @param key: string, The particular claim to retrieve
 * @returns string | undefined
 */
export function getClaim(event: APIGatewayProxyEvent, key: string): string | undefined {
	const claims = (event.requestContext as any)?.authorizer?.claims;
    if (claims && typeof claims === 'object' && key in claims)  {
        return claims[key];
    }
	const jwtClaims = (event.requestContext as any)?.authorizer?.jwt?.claims;
	if (jwtClaims && typeof jwtClaims === 'object' && key in jwtClaims) {
        return jwtClaims[key]
    };
	return undefined;
}

/**
 * Get the user ID of the caller from the API Gateway event
 * @param event: APIGatewayProxyEvent, The API Gateway event
 * @returns string | undefined The user ID of the caller (usually the 'sub' claim in the authorizer)
 * @throws an error if the user ID cannot be determined from the claims
 */
export function getCallerUserId(event: APIGatewayProxyEvent): string {
    const userId = getClaim(event, 'sub');
    if (!userId) {
        throw new Error("Unable to determine user ID from claims");
    }
    return userId;
}

/**
 * Given an API Gateway event, extract the username of the caller from the claims. 
 * It tries email first, then cognito:username, then phone_number.
 * @param event: APIGatewayProxyEvent, The API Gateway event
 * @throws an error if the username cannot be determined from the claims
 */
export function getCallerUsername(event: APIGatewayProxyEvent): string {
    let username = getClaim(event, "email");
    if(!username) {
        username = getClaim(event, "cognito:username")?.trim();
        if(!username) {
            username = getClaim(event, "phone_number")?.trim();
        }
    }
    if (!username) {
        throw new Error("Unable to determine username from claims");
    }
    return username;
}

/**
 * Parse the JSON body of an API Gateway event.
 * @param event: APIGatewayProxyEvent, The API Gateway event
 * @param container: An object whose properties will be populated from the parsed JSON body. The keys of this object represent the required properties in the JSON body.
 * @throws Error if the body is missing or not valid JSON
 * @throws Error if any required properties (keys of the container) are missing from the parsed JSON body
 */
export function parseRequestBody<T extends object>(event: APIGatewayProxyEvent, container: T): void {
    if (!event.body) {
        throw new Error("Missing request body");
    }
    const parsed = JSON.parse(event.body);
    if(typeof parsed !== 'object' || parsed === null) {
        throw new Error("Invalid request body: expected JSON object");
    }
    for(const key of Object.getOwnPropertyNames(container)) {
        if(key in parsed) {
            if(typeof parsed[key] !== typeof (container as any)[key]) {
                throw new Error(`Invalid type for property ${key}: expected ${typeof (container as any)[key]}`);
            }
            if(typeof parsed[key] === 'string' && (parsed[key] as string).trim() === '') {
                throw new Error(`Invalid value for property ${key}: cannot be empty string`);
            }
            if(typeof parsed[key] === 'number' && isNaN(parsed[key])) {
                throw new Error(`Invalid value for property ${key}: cannot be NaN`);
            }
            (container as any)[key] = parsed[key];
        }
        else {
            throw new Error(`Missing required property in request body: ${key}`);
        }
    }
}

/**
 * Get the groups claim from the API Gateway event authorizer (useful for determining if admin)
 * @param event: APIGatewayProxyEvent, The API Gateway event
 * @returns string[] The list of groups the caller belongs to (will return admin if in admin group)
 */
export function getGroups(event: APIGatewayProxyEvent): string[] {
    const groupsRaw = getClaim(event, 'cognito:groups') ?? getClaim(event, 'groups');
    if (!groupsRaw) return [];
    if (Array.isArray(groupsRaw)) return groupsRaw.map(String);
    if (typeof groupsRaw === 'string') {
        try {
            const parsed = JSON.parse(groupsRaw);
            if (Array.isArray(parsed)) {
                return parsed.map(String);
            }
        } catch {}
        return groupsRaw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

/**
 * Checks to see if the caller is authorized to act on behalf of the target userId (basically self or admin)
 * @param event: The event received by the Lambda function
 * @param targetUserId: The userId the caller is trying to act on behalf of
 * @returns boolean indicating if the caller is authorized
 */
export function isAuthorized(event: APIGatewayProxyEvent, targetUserId: string | undefined): boolean {
    const callerSub = getClaim(event, 'sub');
    const groups = getGroups(event);
    if (!targetUserId || !callerSub) return false;
    if (callerSub === targetUserId) return true;
    return groups.includes('admin');
}

/**
 * Checks if the caller belongs to the admin group
 * @param event The event received by the Lambda function
 * @returns boolean indicating if the caller is an admin
 */
export function isAdmin(event: APIGatewayProxyEvent): boolean {
    return getGroups(event).includes('admin');
}

/**
 * USeful utility to convert a Readable stream to a string
 * @param stream: the Readable stream to convert
 * @returns a Promise resolving to the string contents of the stream
 */
export async function streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
}

/**
 * Sanitize a file name by replacing any characters that are not letters, numbers, dots, underscores or hyphens with underscores. This is to ensure the file name is safe to use in S3 keys and URLs.
 * @param name the original file name to sanitize
 * @returns the sanitized file name
 * @throws an error if the resulting file name is empty after sanitization or if it exceeds a reasonable length (e.g. 100 characters)
 */
export function sanitizeFileName(name: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (sanitized === '') {
        throw new Error('Sanitized file name is empty');
    }
    if (sanitized.length > 100) {
        throw new Error('Sanitized file name exceeds maximum length');
    }
    return sanitized;
}