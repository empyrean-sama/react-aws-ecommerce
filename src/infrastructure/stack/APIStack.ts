import * as APIGateway from 'aws-cdk-lib/aws-apigateway';
import * as Cognito from 'aws-cdk-lib/aws-cognito';
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { CfnOutput, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import Constants from '../Constants';

export interface APIStackProps extends StackProps {
	userPool: Cognito.IUserPool;
	profilesTable: DynamoDB.ITable;
}

export default class APIStack extends Stack {

	private readonly _restApi: APIGateway.RestApi;

	constructor(scope: Construct, id: string, props: APIStackProps) {
		super(scope, id, props);

		// Lambda to handle address operations (GET, POST, DELETE)
		const handleAddressFunction = new NodejsFunction(this, 'HandleAddressFunction', {
			entry: path.join(__dirname, '../lambda/HandleAddress.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				PROFILES_TABLE: props.profilesTable.tableName,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		props.profilesTable.grantReadWriteData(handleAddressFunction);

		// Main REST API
		this._restApi = new APIGateway.RestApi(this, 'AddressesApi', {
			restApiName: Constants.apiStackName,
			defaultCorsPreflightOptions: {
				allowOrigins: APIGateway.Cors.ALL_ORIGINS,
				allowMethods: [
					'GET', 'POST', 'DELETE', 'OPTIONS'
				],
				allowHeaders: [
					'Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'
				]
			}
		});

		// Single resource /addresses using one Lambda integration that branches on method
		const addressesResource = this._restApi.root.addResource(Constants.addressesApiName);
		const lambdaIntegration = new APIGateway.LambdaIntegration(handleAddressFunction, {
			proxy: true,
		});

		// Setup Cognito User Pool Authorizer
		const authorizer = new APIGateway.CognitoUserPoolsAuthorizer(this, 'AddressesAuthorizer', {
			cognitoUserPools: [props.userPool],
		});

		// Attach methods with Cognito authorization
		addressesResource.addMethod('GET', lambdaIntegration, {
			authorizer,
			authorizationType: APIGateway.AuthorizationType.COGNITO
		});
		addressesResource.addMethod('POST', lambdaIntegration, {
			authorizer,
			authorizationType: APIGateway.AuthorizationType.COGNITO
		});
		addressesResource.addMethod('DELETE', lambdaIntegration, {
			authorizer,
			authorizationType: APIGateway.AuthorizationType.COGNITO
		});

		// Output the API endpoint URL
		new CfnOutput(this, Constants.apiStackEndpointOutputKey, {
			value: this._restApi.url,
			exportName: Constants.apiStackEndpointOutputKey
		});
	}
}
