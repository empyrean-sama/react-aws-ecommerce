/**
 * Verify Password Lambda function
 *
 * Verifies the provided password for the currently signed-in user.
 * This is done by attempting an auth flow (USER_PASSWORD_AUTH) with Cognito.
 *
 * Method: POST
 * Input: JSON body with { password: "..." }
 * Output: JSON body with { ok: boolean }
 *
 * Authorization: Authenticated users (uses claims from request context)
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { constructResponse, getCallerUsername, parseRequestBody } from "./Helper";

const client = new CognitoIdentityProviderClient({});

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const userPoolClientId = process.env.USER_POOL_CLIENT_ID;
        let username: string;
        let password: string;
        if (!userPoolClientId) {
            return constructResponse(500, { ok: false, message: "Missing USER_POOL_CLIENT_ID" });
        }
        try {
            username = getCallerUsername(event);
            const body = {password: ""};
            parseRequestBody(event, body);
            password = body.password;
        }
        catch (err) {
            console.error("The received request is not valid", err);
            const message = err instanceof Error ? err.message : "Error";
            return constructResponse(400, { ok: false, message });
        }
        try {
            const initiateAuthCommand = new InitiateAuthCommand({AuthFlow: "USER_PASSWORD_AUTH", ClientId: userPoolClientId, AuthParameters: {USERNAME: username, PASSWORD: password}});
            const resp = await client.send(initiateAuthCommand);
            const ok = !!resp.AuthenticationResult || !!resp.ChallengeName;
            return constructResponse(200, { ok });
        }
        catch (err: any) {
            console.error("Verification error:", err);
            return constructResponse(200, { ok: false }); // Return 200 with ok: false for auth failures to avoid leaking info about valid usernames. Only return 500 for actual server errors.
        }
    }
    catch (error: any) {
        console.error("Unhandled exception on the handler, ", error);
        return constructResponse(500, { ok: false, message: "Internal server error" });
    }
}