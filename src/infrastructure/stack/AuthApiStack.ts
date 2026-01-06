import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

import Constants from '../InfrastructureConstants';
import APIStack from './APIStack';

export interface AuthApiStackProps extends StackProps {
	apiStack: APIStack;
	userPoolClientId: string;
}

export default class AuthApiStack extends Stack {
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
	}
}
