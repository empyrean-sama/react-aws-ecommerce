import * as Cognito from 'aws-cdk-lib/aws-cognito'; 
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';

import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"; 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import Constants from "../Constants";

export default class AuthStack extends Stack {

    public readonly profilesTable: DynamoDB.Table;
    public readonly userPool: Cognito.UserPool;
    private readonly _userPoolClient: Cognito.UserPoolClient;

    constructor(scope: Construct, id: string, props: StackProps = {}) {
        super(scope, id, props);

        // Create Cognito User Pool
        this.userPool = new Cognito.UserPool(this, Constants.userPoolName, {
            userPoolName: Constants.userPoolName,
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

        // Output the User Pool ID
        new CfnOutput(this, Constants.userPoolIdOutputKey, {
            value: this.userPool.userPoolId,
            exportName: Constants.userPoolIdOutputKey
        })

        // Create Cognito User Pool Client
        this._userPoolClient = this.userPool.addClient(Constants.userPoolClientName, {
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userPassword: true,
                userSrp: true
            },
            generateSecret: false, // Do not generate client secret for web apps
            preventUserExistenceErrors: true, // Do not reveal if user exists
            enableTokenRevocation: true // Enable token revocation after logout
        });

        // Output the User Pool Client ID
        new CfnOutput(this, Constants.userPoolClientIdOutputKey, {
            value: this._userPoolClient.userPoolClientId,
            exportName: Constants.userPoolClientIdOutputKey
        })

        // Create admin group
        new Cognito.CfnUserPoolGroup(this, Constants.userPoolAdminGroupNameId, {
            userPoolId: this.userPool.userPoolId,
            groupName: Constants.userPoolAdminGroupName
        });

        // Create the Profile DynamoDB table
        this.profilesTable = new DynamoDB.Table(this, Constants.profilesTableId, {
            tableName: Constants.profilesTableName,
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