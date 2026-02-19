import * as Cognito from 'aws-cdk-lib/aws-cognito'; 
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';

import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"; 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import InfrastructureConstants from "../InfrastructureConstants";

import { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } from '../../../.env.json';

function getValidDomainPrefix(rawPrefix: string, fallbackSuffix: string): string {
    const normalized = rawPrefix
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    const reservedTerms = ['amazon', 'cognito', 'aws'];
    const withoutReservedTerms = reservedTerms.reduce((value, term) => value.replace(new RegExp(term, 'g'), '-'), normalized)
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    const ensuredStart = /^[a-z]/.test(withoutReservedTerms) ? withoutReservedTerms : `app-${withoutReservedTerms}`;
    const ensuredNonEmpty = ensuredStart.replace(/^-+/, '').replace(/-+$/, '') || 'app';

    const suffix = fallbackSuffix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'auth';
    const maxBaseLength = 63 - suffix.length - 1;
    const base = ensuredNonEmpty.slice(0, Math.max(1, maxBaseLength)).replace(/-+$/, '') || 'app';

    const candidate = `${base}-${suffix}`;
    return candidate.slice(0, 63).replace(/-+$/, '');
}

export default class AuthStack extends Stack {

    public readonly profilesTable: DynamoDB.Table;
    public readonly cartTable: DynamoDB.Table;
    public readonly userPool: Cognito.UserPool;
    public readonly userPoolClientId: string;
    private readonly _userPoolClient: Cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props: StackProps = {}) {
        super(scope, id, props);

        const callbackUrls: string[] = [];
        const logoutUrls: string[] = [];
        const defaultCallbackUrls = [
            'http://localhost:1234/account',
            'http://localhost:1234/account/login',
            'http://localhost:1234/account/signup',
            'https://react-aws-ecommerce-bugfixing.netlify.app/account/login',
            'https://react-aws-ecommerce-bugfixing.netlify.app/account/signup',
            'https://react-aws-ecommerce-bugfixing.netlify.app/account',
        ];

        const googleClientId = GOOGLE_OAUTH_CLIENT_ID.trim();
        const googleClientSecret = GOOGLE_OAUTH_CLIENT_SECRET.trim();
        const isGoogleFederationEnabled = Boolean(googleClientId && googleClientSecret);

        const stackAccount = props.env?.account ?? process.env.CDK_DEFAULT_ACCOUNT ?? 'dev';
        const stackRegion = props.env?.region ?? process.env.CDK_DEFAULT_REGION ?? 'ap-south-1';
        const defaultDomainPrefix = `reactecommerce-auth-${stackAccount}-${stackRegion}`;
        const configuredDomainPrefix = process.env.COGNITO_DOMAIN_PREFIX || defaultDomainPrefix;
        const userPoolDomainPrefix = getValidDomainPrefix(configuredDomainPrefix, this.node.addr);

        // Create Cognito User Pool
        this.userPool = new Cognito.UserPool(this, InfrastructureConstants.userPoolName, {
            userPoolName: InfrastructureConstants.userPoolName,
            selfSignUpEnabled: true,
            signInAliases: { email: true, phone: false, username: false }, //todo: must make phone true before shipping version- 1
            autoVerify: { email: true, },
            accountRecovery: Cognito.AccountRecovery.PHONE_WITHOUT_MFA_AND_EMAIL,
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
            },
            standardAttributes: {
                givenName: {
                    required: true,
                    mutable: true
                },
                familyName: {
                    required: true,
                    mutable: true
                }
            }
        });

        const userPoolDomain = this.userPool.addDomain('UserPoolHostedUiDomain', {
            cognitoDomain: {
                domainPrefix: userPoolDomainPrefix,
            },
        });

        // Output the User Pool ID
        new CfnOutput(this, InfrastructureConstants.userPoolIdOutputKey, {
            value: this.userPool.userPoolId,
            exportName: InfrastructureConstants.userPoolIdOutputKey
        })

        let googleProvider: Cognito.UserPoolIdentityProviderGoogle | undefined;
        if (isGoogleFederationEnabled && googleClientId && googleClientSecret) {
            googleProvider = new Cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdentityProvider', {
                userPool: this.userPool,
                clientId: googleClientId,
                clientSecret: googleClientSecret,
                scopes: ['openid', 'email', 'profile'],
                attributeMapping: {
                    email: Cognito.ProviderAttribute.GOOGLE_EMAIL,
                    givenName: Cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
                    familyName: Cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
                },
            });
        }

        // Create Cognito User Pool Client
        this._userPoolClient = this.userPool.addClient(InfrastructureConstants.userPoolClientName, {
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userPassword: true,
                userSrp: true
            },
            generateSecret: false, // Do not generate client secret for web apps
            preventUserExistenceErrors: true, // Do not reveal if user exists
            enableTokenRevocation: true, // Enable token revocation after logout
            supportedIdentityProviders: isGoogleFederationEnabled
                ? [Cognito.UserPoolClientIdentityProvider.COGNITO, Cognito.UserPoolClientIdentityProvider.GOOGLE]
                : [Cognito.UserPoolClientIdentityProvider.COGNITO],
            oAuth: {
                callbackUrls: callbackUrls.length > 0 ? callbackUrls : defaultCallbackUrls,
                logoutUrls: logoutUrls.length > 0 ? logoutUrls : ['http://localhost:1234/'],
                scopes: [Cognito.OAuthScope.OPENID, Cognito.OAuthScope.EMAIL, Cognito.OAuthScope.PROFILE],
                flows: {
                    authorizationCodeGrant: true,
                },
            },
        });

        if (googleProvider) {
            this._userPoolClient.node.addDependency(googleProvider);
        }

        this._userPoolClient.node.addDependency(userPoolDomain);

        this.userPoolClientId = this._userPoolClient.userPoolClientId;

        // Output the User Pool Client ID
        new CfnOutput(this, InfrastructureConstants.userPoolClientIdOutputKey, {
            value: this._userPoolClient.userPoolClientId,
            exportName: InfrastructureConstants.userPoolClientIdOutputKey
        })

        new CfnOutput(this, InfrastructureConstants.userPoolHostedUiDomainOutputKey, {
            value: userPoolDomain.baseUrl(),
            exportName: InfrastructureConstants.userPoolHostedUiDomainOutputKey,
        });

        new CfnOutput(this, InfrastructureConstants.googleFederationEnabledOutputKey, {
            value: isGoogleFederationEnabled ? 'true' : 'false',
            exportName: InfrastructureConstants.googleFederationEnabledOutputKey,
        });

        // Create admin group
        new Cognito.CfnUserPoolGroup(this, InfrastructureConstants.userPoolAdminGroupNameId, {
            userPoolId: this.userPool.userPoolId,
            groupName: InfrastructureConstants.userPoolAdminGroupName
        });

        // Create the Profile DynamoDB table
        this.profilesTable = new DynamoDB.Table(this, InfrastructureConstants.profilesTableId, {
            tableName: InfrastructureConstants.profilesTableName,
            partitionKey: { name: 'userId', type: DynamoDB.AttributeType.STRING },
            billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY, //TODO: Change to RETAIN for production
        });

        // Create the Cart DynamoDB table
        this.cartTable = new DynamoDB.Table(this, InfrastructureConstants.cartTableId, {
            tableName: InfrastructureConstants.cartTableName,
            partitionKey: { name: 'userId', type: DynamoDB.AttributeType.STRING },
            billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY, //TODO: Change to RETAIN for production
        });

        const createProfileFunction = new NodejsFunction(this, 'CreateProfileFunction', {
            entry: path.join(__dirname, '../lambda/CreateProfile.ts'),
            handler: 'Handler',
            runtime: Lambda.Runtime.NODEJS_22_X,
            environment: {
                PROFILES_TABLE: this.profilesTable.tableName,
            },
            bundling: { minify: true, sourceMap: true, target: 'node22' },
        });
        this.profilesTable.grantWriteData(createProfileFunction);

        // Add post-confirmation trigger to User Pool
        this.userPool.addTrigger(Cognito.UserPoolOperation.POST_CONFIRMATION, createProfileFunction);
    }
}
