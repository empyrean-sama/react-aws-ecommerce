import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

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
            if (Array.isArray(parsed)) return parsed.map(String);
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