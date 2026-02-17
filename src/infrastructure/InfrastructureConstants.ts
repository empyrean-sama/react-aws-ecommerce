export default class InfrastructureConstants {
    
    // Project wide constants
    static get projectName(): string { return "ReactAwsEcommerce"; }
    static get region(): string { return "ap-south-1"; }
    
    // Stack output keys
    static get authStackOutputKey(): string { return `${InfrastructureConstants.projectName}-AuthStack`; }
    static get authApiStackOutputKey(): string { return `${InfrastructureConstants.projectName}-AuthApiStack`; }
    static get apiStackOutputKey(): string { return `${InfrastructureConstants.projectName}-APIStack`; }
    static get profileStackOutputKey(): string { return `${InfrastructureConstants.projectName}-ProfileStack`; }
    static get apiStackName(): string { return `${InfrastructureConstants.projectName}-APIStack`; }
    static get apiStackEndpointOutputKey(): string { return `APIStackEndpoint`; }
    static get memoryStackOutputKey(): string { return `${InfrastructureConstants.projectName}-MemoryStack`; }
    static get memoryBucketNameOutputKey(): string { return `${InfrastructureConstants.projectName}MemoryBucketName`; }
    
    // User Pool constants
    static get userPoolName(): string { return `${InfrastructureConstants.projectName}-UserPool`; }
    static get userPoolClientName(): string { return `${InfrastructureConstants.projectName}-UserPoolClient`; }
    static get userPoolIdOutputKey(): string { return `UserPoolId`; }
    static get userPoolClientIdOutputKey(): string { return `UserPoolClientId`; }
    static get userPoolAdminGroupName(): string { return `admin`; }
    static get userPoolAdminGroupNameId(): string { return `UserPoolAdminGroup`; }

    // Profiles Table constants
    static get profilesTableName(): string { return `${InfrastructureConstants.projectName}-profiles`; }
    static get profilesTableId(): string { return `${InfrastructureConstants.projectName}-ProfilesTable`; }

    // Product Stack constants
    static get productTableId(): string { return `${InfrastructureConstants.projectName}-ProductsTable`; }
    static get productTableName(): string { return `${InfrastructureConstants.projectName}-products`; }
    static get reviewTableId(): string { return `${InfrastructureConstants.projectName}-ReviewsTable`; }
    static get reviewTableName(): string { return `${InfrastructureConstants.projectName}-reviews`; }
    static get ordersTableId(): string { return `${InfrastructureConstants.projectName}-OrdersTable`; }
    static get ordersTableName(): string { return `${InfrastructureConstants.projectName}-orders`; }
    static get variantTableId(): string { return `${InfrastructureConstants.projectName}-VariantsTable`; }
    static get variantTableName(): string { return `${InfrastructureConstants.projectName}-variants`; }
    static get collectionTableId(): string { return `${InfrastructureConstants.projectName}-CollectionsTable`; }
    static get collectionTableName(): string { return `${InfrastructureConstants.projectName}-collections`; }
    static get collectionGSINameOnFavourite(): string { return `FavouriteIndex`; }
    static get productGSINameOnCollectionId(): string { return `CollectionIdIndex`; }
    static get productGSINameOnFeatured(): string { return `FeaturedIndex`; }
    static get productGSINameOnCollectionFavourite(): string { return `CollectionFavouriteIndex`; }
    static get variantGSINameOnProductId(): string { return `ProductIdIndex`; }
    static get reviewGSINameOnProductId(): string { return `ProductIdIndex`; }
    
    // Product Stack output key (for consistency)
    static get productStackOutputKey(): string { return `${InfrastructureConstants.projectName}-ProductStack`; }
    
    // API Gateway constants
    static get restAPIGatewayId(): string { return `${InfrastructureConstants.projectName}-RestAPIGateway`; }
    static get restAPIgatewayName(): string { return `${InfrastructureConstants.projectName}-RestAPIGateway`; }
    static get cartResourceName(): string { return `cart`; }
    // Address Table constants
    static get addressTableId(): string { return `${InfrastructureConstants.projectName}-AddressesTable`; }
    static get addressTableName(): string { return `${InfrastructureConstants.projectName}-addresses`; }

    // Cart Table constants
    static get cartTableId(): string { return `${InfrastructureConstants.projectName}-CartTable`; }
    static get cartTableName(): string { return `${InfrastructureConstants.projectName}-cart`; }
    static get addressGSINameOnUserId(): string { return `UserIdIndex`; }

    // API Resource names
    static get addressResourceName(): string { return `address`; }
    static get autofillAddressResourceName(): string { return `autofill-address`; }
    static get uploadUrlResourceName(): string { return `upload-url`; }
    static get verifyPasswordResourceName(): string { return `verify-password`; }
    static get collectionResourceName(): string { return `collection`; }
    static get productResourceName(): string { return `product`; }
    static get reviewResourceName(): string { return `review`; }
    static get reviewEligibilityResourceName(): string { return `review-eligibility`; }
    static get reviewAverageResourceName(): string { return `review-average`; }
    static get productSearchIndexResourceName(): string { return `product-search-index`; }
    static get productTagsResourceName(): string { return `product-tags`; }
    static get productDefaultVariantResourceName(): string { return `product-default-variant`; }
    static get variantResourceName(): string { return `variant`; }
    static get imageResourceName(): string { return `image`; }
    static get listResourceName(): string { return `list`; }

    // Public search index object
    static get productSearchIndexObjectKey(): string { return `search/product-search-index.json`; }
}