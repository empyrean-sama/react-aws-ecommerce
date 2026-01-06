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
import { constructResponse, getClaim } from "../Helper";

const client = new CognitoIdentityProviderClient({});

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const userPoolClientId = process.env.USER_POOL_CLIENT_ID;
        if (!userPoolClientId) {
            return constructResponse(500, { ok: false, message: "Missing USER_POOL_CLIENT_ID" });
        }

        // Determine username from claims (prefer email, then username, then phone)
        let username = getClaim(event, "email");
        if (username) {
            username = username.trim().toLowerCase();
        } else {
            username = getClaim(event, "cognito:username")?.trim();
        }
        if (!username) {
            username = getClaim(event, "phone_number")?.trim();
        }

        if (!username) {
            return constructResponse(400, { ok: false, message: "Unable to determine username from session" });
        }

        const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body ?? {});
        const password = body?.password;
        if (!password || typeof password !== "string") {
            return constructResponse(400, { ok: false, message: "Missing password" });
        }

        try {
            const resp = await client.send(
                new InitiateAuthCommand({
                    AuthFlow: "USER_PASSWORD_AUTH",
                    ClientId: userPoolClientId,
                    AuthParameters: {
                        USERNAME: username,
                        PASSWORD: password,
                    },
                })
            );

            // If we get tokens or a challenge, the password was correct
            const ok = !!resp.AuthenticationResult || !!resp.ChallengeName;
            return constructResponse(200, { ok });
        } catch (err: any) {
            const name = String(err?.name ?? "");
            if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
                return constructResponse(200, { ok: false });
            }
            console.error("Verification error:", err);
            return constructResponse(500, { ok: false, message: "Verification failed" });
        }
    } catch (error: any) {
        console.error("Handler error:", error);
        return constructResponse(500, { ok: false, message: "Internal server error" });
    }
}
