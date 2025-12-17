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
            enforceSSL: true,
        });

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

        // Lambda to generate presigned upload URL (admin only)
        const presignLambda = new NodejsFunction(this, 'GeneratePresignedUploadUrlFunction', {
            functionName: 'GeneratePresignedUploadUrl',
            entry: path.join(__dirname, '..', 'lambda', 'Memory', 'PresignUpload.ts'),
            handler: 'Handle',
            runtime: Lambda.Runtime.NODEJS_22_X,
            environment: {
                BUCKET_NAME: bucket.bucketName,
                MAX_IMAGE_BYTES: String(ProjectConstants.IMAGE_UPLOAD_MAX_BYTES),
            },
            bundling: { minify: true, sourceMap: true, target: 'node22' },
        });
        bucket.grantPut(presignLambda);

        // Expose API endpoint to request presigned URL (Cognito auth enabled by default)
        const presignIntegration = new LambdaIntegration(presignLambda);
        props.apiStack.addMethodOnResource('upload-url', 'POST', presignIntegration);
    }
}