export default class Constants {
    static get projectName(): string { return "ReactAwsEcommerce"; }
    static get region(): string { return "us-east-1"; }
    static get authStackOutputKey(): string { return `${Constants.projectName}-AuthStack`; }
    static get userPoolName(): string { return `${Constants.projectName}-UserPool`; }
    static get userPoolClientName(): string { return `${Constants.projectName}-UserPoolClient`; }
    static get userPoolIdOutputKey(): string { return `UserPoolId`; }
    static get userPoolClientIdOutputKey(): string { return `UserPoolClientId`; }
    static get userPoolAdminGroupName(): string { return `admin`; }
    static get userPoolAdminGroupNameId(): string { return `UserPoolAdminGroup`; }
    static get profilesTableName(): string { return `${Constants.projectName}-profiles`; }
    static get profilesTableId(): string { return `${Constants.projectName}-ProfilesTable`; }
}