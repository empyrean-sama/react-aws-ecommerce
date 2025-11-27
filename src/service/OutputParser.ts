import Outputs from '../../outputs.json';
import Constants from "../infrastructure/Constants";

export default class OutputParser {

    /**
     * Get the Cognito User Pool ID from the CloudFormation outputs
     * @returns the User Pool ID
     */
    public static get UserPoolId(): string {
        const userPoolId = (Outputs as any)[Constants.authStackOutputKey][Constants.userPoolIdOutputKey];
        if(!userPoolId) {
            throw new Error("User Pool ID not found in CloudFormation outputs.");
        }
        return userPoolId;
    }

    /**
     * Get the Cognito User Pool Client ID from the CloudFormation outputs
     * @returns the User Pool Client ID
     */
    public static get UserPoolClientId(): string {
        const userPoolClientId = (Outputs as any)[Constants.authStackOutputKey][Constants.userPoolClientIdOutputKey];
        if(!userPoolClientId) {
            throw new Error("User Pool Client ID not found in CloudFormation outputs.");
        }
        return userPoolClientId;
    }
}