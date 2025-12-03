export default class InfrastructureConstants {
    
    // Project wide constants
    static get projectName(): string { return "ReactAwsEcommerce"; }
    static get region(): string { return "us-east-1"; }
    
    // Stack output keys
    static get authStackOutputKey(): string { return `${InfrastructureConstants.projectName}-AuthStack`; }
    static get apiStackOutputKey(): string { return `${InfrastructureConstants.projectName}-APIStack`; }
    static get profileStackOutputKey(): string { return `${InfrastructureConstants.projectName}-ProfileStack`; }
    static get apiStackName(): string { return `${InfrastructureConstants.projectName}-APIStack`; }
    static get apiStackEndpointOutputKey(): string { return `APIStackEndpoint`; }
    
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
    
    // API Gateway constants
    static get restAPIGatewayId(): string { return `${InfrastructureConstants.projectName}-RestAPIGateway`; }
    static get restAPIgatewayName(): string { return `${InfrastructureConstants.projectName}-RestAPIGateway`; }
    // Address Table constants
    static get addressTableId(): string { return `${InfrastructureConstants.projectName}-AddressesTable`; }
    static get addressTableName(): string { return `${InfrastructureConstants.projectName}-addresses`; }
    static get addressGSINameOnUserId(): string { return `UserIdIndex`; }

    // API Resource names
    static get addressResourceName(): string { return `address`; }
    static get autofillAddressResourceName(): string { return `autofill-address`; }
}