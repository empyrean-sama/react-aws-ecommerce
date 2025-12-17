import Outputs from '../../outputs.json';
import Constants from "../infrastructure/InfrastructureConstants";

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

    /**
     * Get the API Endpoint URL from the CloudFormation outputs
     * @returns the API Endpoint URL
     */
    public static get ApiEndpoint(): string {
        const apiEndpoint = (Outputs as any)[Constants.apiStackOutputKey][Constants.apiStackEndpointOutputKey];
        if(!apiEndpoint) {
            throw new Error("API Endpoint not found in CloudFormation outputs.");
        }
        return apiEndpoint;
    }

    /**
     * Get the full Addresses API endpoint URL
     * The addresses endpoint is constructed by appending 'addresses' to the base API endpoint.
     * It supports operations GET, POST, DELETE for managing addresses.
     * @returns the Addresses API endpoint URL
     */
    public static get AddressesEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.addressResourceName}`;
    }

    /**
     * Get the full Autofill Address API endpoint URL
     * The autofill address endpoint is constructed by appending 'autofill-address' to the base API endpoint.
     * It supports the GET operation for address autocomplete.
     * @returns the Autofill Address API endpoint URL
     */
    public static get AutofillAddressEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.autofillAddressResourceName}`;
    }

    /**
     * Get the full Upload URL API endpoint
     * Used to request a presigned URL for S3 uploads.
     */
    public static get UploadToMemoryEndPointURL(): URL {
        return new URL(`${this.ApiEndpoint}${Constants.uploadUrlResourceName}`);
    }

    /**
     * Get the public S3 bucket name used for memory uploads (public-read).
     */
    public static get MemoryBucketName(): string {
        const bucketName = (Outputs as any)[Constants.memoryStackOutputKey]?.[Constants.memoryBucketNameOutputKey];
        if (!bucketName) {
            throw new Error("Memory bucket name not found in CloudFormation outputs.");
        }
        return bucketName;
    }
}