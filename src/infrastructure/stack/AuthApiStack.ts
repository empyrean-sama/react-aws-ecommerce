import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';

import Constants from '../InfrastructureConstants';
import APIStack from './APIStack';

export interface AuthApiStackProps extends StackProps {
	apiStack: APIStack;
	userPoolClientId: string;
	cartTable: DynamoDB.Table;
}

export default class AuthApiStack extends Stack {

	public _manageCartLambda: NodejsFunction;

	constructor(scope: Construct, id: string, props: AuthApiStackProps) {
		super(scope, id, props);

		const verifyPasswordLambda = new NodejsFunction(this, 'VerifyPasswordFunction', {
			functionName: 'VerifyPasswordFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Auth', 'VerifyPassword.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				USER_POOL_CLIENT_ID: props.userPoolClientId,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});

		const integration = new LambdaIntegration(verifyPasswordLambda);
		props.apiStack.addMethodOnResource(Constants.verifyPasswordResourceName, 'POST', integration, true);

		this._manageCartLambda = new NodejsFunction(this, 'ManageCartFunction', {
			functionName: 'ManageCartFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Cart', 'ManageCart.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				CART_TABLE_NAME: props.cartTable.tableName,
				VARIANT_TABLE_NAME: Constants.variantTableName,
				PRODUCT_TABLE_NAME: Constants.productTableName,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
        
        props.cartTable.grantReadWriteData(this._manageCartLambda);

		const manageCartIntegration = new LambdaIntegration(this._manageCartLambda);
        props.apiStack.addMethodOnResource(Constants.cartResourceName, 'GET', manageCartIntegration, true);
		props.apiStack.addMethodOnResource(Constants.cartResourceName, 'POST', manageCartIntegration, true); // Set/Update Cart
        props.apiStack.addMethodOnResource(Constants.cartResourceName, 'DELETE', manageCartIntegration, true); // Delete Cart
	}
}
