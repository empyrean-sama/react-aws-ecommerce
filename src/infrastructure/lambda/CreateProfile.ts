/**
 * Create Profile Lambda handler
 *
 * This handler is triggered when a user confirms their account (post-confirmation trigger).
 * It creates a profile entry in the DynamoDB profiles table for the new user.
 *
 * Trigger: Cognito User Pool Post-Confirmation
 * Input: Cognito event with user attributes
 * Output: Success confirmation
 */
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { PostConfirmationTriggerEvent } from 'aws-lambda';

const dynamoDbClient = new DynamoDBClient({});

// Environment variables available
const PROFILES_TABLE = process.env.PROFILES_TABLE;

export async function Handler(event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> {
    try 
    {
        if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
            const userAttributes = event.request.userAttributes;
            const userId = userAttributes.sub;

            if (!userId) {
                console.error('CreateProfile: No user sub found in userAttributes, cannot create profile', userAttributes);
                return event;
            }

            const profileData: any = {
                userId: userId,
                email: userAttributes.email,
                emailVerified: userAttributes.email_verified === 'true',
                phoneNumber: userAttributes.phone_number,
                phoneNumberVerified: userAttributes.phone_number_verified === 'true',
                givenName: userAttributes.given_name,
                familyName: userAttributes.family_name,
            };

            await dynamoDbClient.send(new PutItemCommand({
                TableName: PROFILES_TABLE,
                Item: marshall(profileData, { removeUndefinedValues: true }),
                ConditionExpression: 'attribute_not_exists(id)', // Only create if doesn't exist
            }));
        }
    }
    catch (error) {
        console.error('Error creating profile in DynamoDB:', error);
    }
    return event;
}