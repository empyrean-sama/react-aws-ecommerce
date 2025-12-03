import * as Cognito from 'aws-cdk-lib/aws-cognito'; 
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';

import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"; 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import Constants from "../InfrastructureConstants";
import APIStack from './APIStack';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

import env from '../../../.env.json';

export interface ProfileStackProps extends StackProps {
    profilesTable: DynamoDB.Table;
    apiStack: APIStack;
}

export default class ProfileStack extends Stack {

    private readonly _addressTable: DynamoDB.Table;

    constructor(scope: Construct, id: string, props: ProfileStackProps) {
        super(scope, id, props); // call super

        // Construct the address table
        this._addressTable = new DynamoDB.Table(this, Constants.addressTableId, {
            tableName: Constants.addressTableName,
            partitionKey: { name: 'addressId', type: DynamoDB.AttributeType.STRING },
            billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY, //TODO: Change to RETAIN for production
        });
        this._addressTable.addGlobalSecondaryIndex({
            indexName: Constants.addressGSINameOnUserId,
            partitionKey: { name: 'userId', type: DynamoDB.AttributeType.STRING },
        });

        // Create the Address Lambda function
        const addressLambda = new NodejsFunction(this, 'ProfileAddressFunction', {
            functionName: "AddressFunction",
            entry: path.join(__dirname, '..', 'lambda', 'Profile', 'Address.ts'),
            handler: 'Handle',
            runtime: Lambda.Runtime.NODEJS_22_X,
            environment: {
                ADDRESS_TABLE: this._addressTable.tableName,
            },
        });
        this._addressTable.grantReadWriteData(addressLambda);
        const addressLambdaIntegration = new LambdaIntegration(addressLambda);
        props.apiStack.addMethodOnResource(Constants.addressResourceName, 'GET', addressLambdaIntegration);
        props.apiStack.addMethodOnResource(Constants.addressResourceName, 'POST', addressLambdaIntegration);
        props.apiStack.addMethodOnResource(Constants.addressResourceName, 'PUT', addressLambdaIntegration);
        props.apiStack.addMethodOnResource(Constants.addressResourceName, 'DELETE', addressLambdaIntegration);

        // Create the Autofill Address Lambda function
        const autofillAddressLambda = new NodejsFunction(this, 'AutofillAddressFunction', {
            functionName: "AutofillAddressFunction",
            entry: path.join(__dirname, '..', 'lambda', 'Profile', 'AutofillAddress.ts'),
            handler: 'Handle',
            runtime: Lambda.Runtime.NODEJS_22_X,
            environment: {
                GEOAPIFY_API_KEY: env.autoCompleteGeoapifyAPIKey || '',
            },
            timeout: Duration.seconds(20),
        });
        const autofillAddressLambdaIntegration = new LambdaIntegration(autofillAddressLambda);
        props.apiStack.addMethodOnResource(Constants.autofillAddressResourceName, 'GET', autofillAddressLambdaIntegration, false);
    }
}