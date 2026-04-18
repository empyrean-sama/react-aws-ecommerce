import * as S3 from 'aws-cdk-lib/aws-s3';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import ProjectConstants from '../../Constants';
import Constants from '../InfrastructureConstants';
import APIStack from './APIStack';

export interface MemoryStackProps extends StackProps {
    apiStack: APIStack;
}

export default class MemoryStack extends Stack {
    public readonly memoryBucket: S3.Bucket;

    constructor(scope: Construct, id: string, props: MemoryStackProps) {
        super(scope, id, props);

        // Create an S3 Bucket for storing memory
        const bucket = new S3.Bucket(this, 'PublicReadMemoryBucket', {
            encryption: S3.BucketEncryption.S3_MANAGED,
            objectOwnership: S3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            blockPublicAccess: new S3.BlockPublicAccess({
                blockPublicAcls: true,
                ignorePublicAcls: true,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: RemovalPolicy.DESTROY, // TODO: change to RETAIN for production
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        this.memoryBucket = bucket;

        // Allow browser uploads via presigned URL (CORS for S3)
        bucket.addCorsRule({
            allowedMethods: [
                S3.HttpMethods.PUT,
                S3.HttpMethods.GET,
                S3.HttpMethods.HEAD,
            ],
            allowedOrigins: ['*'], // TODO: restrict to specific origins in production
            allowedHeaders: ['*'],
            exposedHeaders: ['ETag', 'x-amz-version-id'],
            maxAge: 300,
        });

        // Allow public read of objects via bucket policy
        bucket.addToResourcePolicy(new IAM.PolicyStatement({
            sid: 'AllowPublicRead',
            effect: IAM.Effect.ALLOW,
            principals: [new IAM.AnyPrincipal()],
            actions: ['s3:GetObject'],
            resources: [bucket.arnForObjects('*')],
        }));

        // Output the bucket name
        new CfnOutput(this, Constants.memoryBucketNameOutputKey, {
            value: bucket.bucketName,
            exportName: Constants.memoryBucketNameOutputKey,
        });

        // Unified memory lambda for presigned URLs, list management, and image deletions.
        const memoryLambda = new NodejsFunction(this, 'MemoryFunction', {
            entry: path.join(__dirname, '..', 'lambda', 'Memory.ts'),
            handler: 'Handle',
            runtime: Lambda.Runtime.NODEJS_22_X,
            environment: {
                BUCKET_NAME: bucket.bucketName,
                MAX_IMAGE_BYTES: String(ProjectConstants.PRODUCT_IMAGE_MAX_BYTES),
            },
            bundling: { minify: true, sourceMap: true, target: 'node22' },
        });
        bucket.grantRead(memoryLambda);
        bucket.grantPut(memoryLambda);
        bucket.grantDelete(memoryLambda);

        const memoryIntegration = new LambdaIntegration(memoryLambda);
        props.apiStack.addMethodOnResource(Constants.genPresignedUrlResourceName, 'POST', memoryIntegration, true);
        props.apiStack.addMethodOnResource(Constants.imageResourceName, 'DELETE', memoryIntegration, true);
        props.apiStack.addMethodOnResource(Constants.listResourceName, 'GET', memoryIntegration, false);
        props.apiStack.addMethodOnResource(Constants.listResourceName, 'PUT', memoryIntegration, true);
        props.apiStack.addMethodOnResource(Constants.listResourceName, 'DELETE', memoryIntegration, true);
    }
}