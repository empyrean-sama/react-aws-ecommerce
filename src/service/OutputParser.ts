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
     * Get Cognito Hosted UI domain URL if configured.
     * @returns domain URL or null when not configured/deployed yet
     */
    public static get UserPoolHostedUiDomain(): string | null {
        const hostedUiDomain = (Outputs as any)[Constants.authStackOutputKey]?.[Constants.userPoolHostedUiDomainOutputKey];
        if (!hostedUiDomain || typeof hostedUiDomain !== 'string') {
            return null;
        }
        return hostedUiDomain;
    }

    /**
     * Whether Google federation was enabled in the deployed auth stack.
     */
    public static get IsGoogleFederationEnabled(): boolean {
        const enabled = (Outputs as any)[Constants.authStackOutputKey]?.[Constants.googleFederationEnabledOutputKey];
        return String(enabled).toLowerCase() === 'true';
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
     * Verify-password endpoint URL.
     * Used to verify the current user's password without changing the client auth session.
     */
    public static get VerifyPasswordEndPointURL(): URL {
        return new URL(`${this.ApiEndpoint}${Constants.verifyPasswordResourceName}`);
    }

    /**
     * Get the full Cart API endpoint URL
     */
    public static get CartEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.cartResourceName}`;
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

    // Product APIs
    public static get CollectionsEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.collectionResourceName}`;
    }
    public static get ProductsEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.productResourceName}`;
    }
    public static get ReviewsEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.reviewResourceName}`;
    }
    public static get ReviewEligibilityEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.reviewEligibilityResourceName}`;
    }
    public static get ReviewAverageEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.reviewAverageResourceName}`;
    }
    public static get ProductSearchIndexEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.productSearchIndexResourceName}`;
    }
    public static get CheckoutEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.checkoutResourceName}`;
    }
    public static get CheckoutAuthEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.checkoutAuthResourceName}`;
    }
    public static get ProductSearchIndexPublicURL(): string {
        const encodedKey = Constants.productSearchIndexObjectKey
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        return `https://${this.MemoryBucketName}.s3.${Constants.region}.amazonaws.com/${encodedKey}`;
    }
    public static get ProductTagsEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.productTagsResourceName}`;
    }
    public static get ProductDefaultVariantEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.productDefaultVariantResourceName}`;
    }
    public static get VariantsEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.variantResourceName}`;
    }
    public static get ImageEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.imageResourceName}`;
    }

    /**
     * Get the full List API endpoint URL
     */
    public static get ListEndPointURL(): string {
        return `${this.ApiEndpoint}${Constants.listResourceName}`;
    }
}