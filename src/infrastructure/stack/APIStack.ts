import * as APIGateway from 'aws-cdk-lib/aws-apigateway';
import * as Cognito from 'aws-cdk-lib/aws-cognito';

import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import Constants from '../InfrastructureConstants';

export interface APIStackProps extends StackProps {
	userPool: Cognito.IUserPool;
}

export default class APIStack extends Stack {

	private readonly _restAPIGateway: APIGateway.RestApi;
	private readonly _resources: Map<string, APIGateway.Resource> = new Map();
	private readonly _authorizer: APIGateway.CognitoUserPoolsAuthorizer;

	constructor(scope: Construct, id: string, props: APIStackProps) {
		super(scope, id, props);

		// Create REST API Gateway
		this._restAPIGateway = new APIGateway.RestApi(this, Constants.restAPIGatewayId, {
			restApiName: Constants.restAPIgatewayName,
			defaultCorsPreflightOptions: {
				allowOrigins: APIGateway.Cors.ALL_ORIGINS,
				allowHeaders: [
					'Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token' //TODO: review headers
				]
			}
		});

		// Setup Cognito User Pool Authorizer
		this._authorizer = new APIGateway.CognitoUserPoolsAuthorizer(this, 'restAPIAuthorizer', {
			cognitoUserPools: [props.userPool],
		});

		// Output the API Endpoint URL
		new CfnOutput(this, Constants.apiStackEndpointOutputKey, {
			value: this._restAPIGateway.url,
			exportName: Constants.apiStackEndpointOutputKey
		});
	}

	public addMethodOnResource(resourceName: string, methodType: 'GET' | 'POST' | 'PUT' | 'DELETE', lambdaIntegration: APIGateway.LambdaIntegration, addAuthorizer: boolean = true) {
		
		// Get a created resource or create it if it doesn't exist
		let resource = this._resources.get(resourceName);
		if (!resource) {
			resource = this._restAPIGateway.root.addResource(resourceName);
			this._resources.set(resourceName, resource);
		}
		
		// Add method with Cognito authorization
		resource.addMethod(methodType, lambdaIntegration, {
			authorizer: addAuthorizer ? this._authorizer : undefined,
			authorizationType: addAuthorizer ? APIGateway.AuthorizationType.COGNITO : undefined
		});
	}
}
