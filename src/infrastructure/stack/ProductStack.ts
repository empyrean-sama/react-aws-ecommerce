
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as S3 from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import Constants from '../InfrastructureConstants';
import APIStack from './APIStack';
import AuthApiStack from './AuthApiStack';
import {RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET} from "../../../.env.json";

export interface ProductStackProps extends StackProps {
	apiStack: APIStack;
	authAPIStack: AuthApiStack;
	memoryBucket: S3.IBucket;
}

export default class ProductStack extends Stack {
	private readonly _collectionTable: DynamoDB.Table;
	private readonly _productTable: DynamoDB.Table;
	private readonly _reviewTable: DynamoDB.Table;
	private readonly _ordersTable: DynamoDB.Table;
	private readonly _variantTable: DynamoDB.Table;

	constructor(scope: Construct, id: string, props: ProductStackProps) {
		super(scope, id, props);

		this._collectionTable = new DynamoDB.Table(this, Constants.collectionTableId, {
			tableName: Constants.collectionTableName,
			partitionKey: { name: 'collectionId', type: DynamoDB.AttributeType.STRING },
			billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY, // TODO: change to RETAIN in production
		});
		this._collectionTable.addGlobalSecondaryIndex({
			indexName: Constants.collectionGSINameOnFavourite,
			partitionKey: { name: 'favourite', type: DynamoDB.AttributeType.STRING },
		});

		this._productTable = new DynamoDB.Table(this, Constants.productTableId, {
			tableName: Constants.productTableName,
			partitionKey: { name: 'productId', type: DynamoDB.AttributeType.STRING },
			billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY, // TODO: change to RETAIN in production
		});
		this._productTable.addGlobalSecondaryIndex({
			indexName: Constants.productGSINameOnCollectionId,
			partitionKey: { name: 'collectionId', type: DynamoDB.AttributeType.STRING },
		});
		this._productTable.addGlobalSecondaryIndex({
			indexName: Constants.productGSINameOnFeatured,
			partitionKey: { name: 'featured', type: DynamoDB.AttributeType.STRING },
			sortKey: { name: 'productId', type: DynamoDB.AttributeType.STRING },
		});
		this._productTable.addGlobalSecondaryIndex({
			indexName: Constants.productGSINameOnCollectionFavourite,
			partitionKey: { name: 'collectionId', type: DynamoDB.AttributeType.STRING },
			sortKey: { name: 'favourite', type: DynamoDB.AttributeType.STRING },
		});

		this._variantTable = new DynamoDB.Table(this, Constants.variantTableId, {
			tableName: Constants.variantTableName,
			partitionKey: { name: 'variantId', type: DynamoDB.AttributeType.STRING },
			billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY, // TODO: change to RETAIN in production
		});
		this._variantTable.addGlobalSecondaryIndex({
			indexName: Constants.variantGSINameOnProductId,
			partitionKey: { name: 'productId', type: DynamoDB.AttributeType.STRING },
		});

		this._reviewTable = new DynamoDB.Table(this, Constants.reviewTableId, {
			tableName: Constants.reviewTableName,
			partitionKey: { name: 'reviewId', type: DynamoDB.AttributeType.STRING },
			billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY, // TODO: change to RETAIN in production
		});
		this._reviewTable.addGlobalSecondaryIndex({
			indexName: Constants.reviewGSINameOnProductId,
			partitionKey: { name: 'productId', type: DynamoDB.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: DynamoDB.AttributeType.NUMBER },
		});

		this._ordersTable = new DynamoDB.Table(this, Constants.ordersTableId, {
			tableName: Constants.ordersTableName,
			partitionKey: { name: 'userId', type: DynamoDB.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: DynamoDB.AttributeType.NUMBER },
			billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY, // TODO: change to RETAIN in production
		});

		this._variantTable.grantReadData(props.authAPIStack._manageCartLambda);
		this._productTable.grantReadData(props.authAPIStack._manageCartLambda);

		// Lambda: Collections
		const collectionLambda = new NodejsFunction(this, 'ProductCollectionFunction', {
			functionName: 'ProductCollectionFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Product', 'Collection.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				COLLECTION_TABLE: this._collectionTable.tableName,
				COLLECTION_FAVOURITE_INDEX: Constants.collectionGSINameOnFavourite,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		this._collectionTable.grantReadWriteData(collectionLambda);
		const collectionIntegration = new LambdaIntegration(collectionLambda);
		props.apiStack.addMethodOnResource('collection', 'GET', collectionIntegration, false);
		props.apiStack.addMethodOnResource('collection', 'POST', collectionIntegration);
		props.apiStack.addMethodOnResource('collection', 'PUT', collectionIntegration);
		props.apiStack.addMethodOnResource('collection', 'PATCH', collectionIntegration);
		props.apiStack.addMethodOnResource('collection', 'DELETE', collectionIntegration);

		// Lambda: Product
		const productLambda = new NodejsFunction(this, 'ProductFunction', {
			functionName: 'ProductFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Product', 'Product.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				PRODUCT_TABLE: this._productTable.tableName,
				VARIANT_TABLE: this._variantTable.tableName,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		this._productTable.grantReadWriteData(productLambda);
		this._variantTable.grantReadWriteData(productLambda);
		const productIntegration = new LambdaIntegration(productLambda);
		props.apiStack.addMethodOnResource('product', 'GET', productIntegration, false);
		props.apiStack.addMethodOnResource('product', 'POST', productIntegration);
		props.apiStack.addMethodOnResource('product', 'PUT', productIntegration);
		props.apiStack.addMethodOnResource('product', 'DELETE', productIntegration);
		// Tags endpoint (read-only)
		props.apiStack.addMethodOnResource(Constants.productTagsResourceName, 'GET', productIntegration, false);
		// Special endpoint for default variant updates
		props.apiStack.addMethodOnResource('product-default-variant', 'PUT', productIntegration);

		// Lambda: Variants
		const variantLambda = new NodejsFunction(this, 'ProductVariantFunction', {
			functionName: 'ProductVariantFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Product', 'Variant.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				VARIANT_TABLE: this._variantTable.tableName,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		this._variantTable.grantReadWriteData(variantLambda);
		const variantIntegration = new LambdaIntegration(variantLambda);
		props.apiStack.addMethodOnResource('variant', 'GET', variantIntegration, false);
		props.apiStack.addMethodOnResource('variant', 'POST', variantIntegration);
		props.apiStack.addMethodOnResource('variant', 'PUT', variantIntegration);
		props.apiStack.addMethodOnResource('variant', 'DELETE', variantIntegration);

		// Lambda: Reviews
		const reviewLambda = new NodejsFunction(this, 'ProductReviewFunction', {
			functionName: 'ProductReviewFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Product', 'Review.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				REVIEW_TABLE: this._reviewTable.tableName,
				ORDERS_TABLE: this._ordersTable.tableName,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		this._reviewTable.grantReadWriteData(reviewLambda);
		this._ordersTable.grantReadData(reviewLambda);

		const reviewIntegration = new LambdaIntegration(reviewLambda);
		props.apiStack.addMethodOnResource(Constants.reviewResourceName, 'GET', reviewIntegration, false);
		props.apiStack.addMethodOnResource(Constants.reviewEligibilityResourceName, 'GET', reviewIntegration, true);
		props.apiStack.addMethodOnResource(Constants.reviewAverageResourceName, 'GET', reviewIntegration, false);
		props.apiStack.addMethodOnResource(Constants.reviewResourceName, 'POST', reviewIntegration, true);
		props.apiStack.addMethodOnResource(Constants.reviewResourceName, 'PUT', reviewIntegration, true);
		props.apiStack.addMethodOnResource(Constants.reviewResourceName, 'DELETE', reviewIntegration, true);

		// Lambda: Checkout (guest + authenticated)
		const checkoutLambda = new NodejsFunction(this, 'CheckoutFunction', {
			functionName: 'CheckoutFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Product', 'Checkout.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				PRODUCT_TABLE: this._productTable.tableName,
				VARIANT_TABLE: this._variantTable.tableName,
				ORDERS_TABLE: this._ordersTable.tableName,
				RAZORPAY_KEY_ID: RAZORPAY_KEY_ID,
				RAZORPAY_KEY_SECRET: RAZORPAY_KEY_SECRET,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		this._productTable.grantReadData(checkoutLambda);
		this._variantTable.grantReadData(checkoutLambda);
		this._ordersTable.grantReadWriteData(checkoutLambda);

		const checkoutIntegration = new LambdaIntegration(checkoutLambda);
		props.apiStack.addMethodOnResource(Constants.checkoutResourceName, 'POST', checkoutIntegration, false);
		props.apiStack.addMethodOnResource(Constants.checkoutResourceName, 'PUT', checkoutIntegration, false);
		props.apiStack.addMethodOnResource(Constants.checkoutAuthResourceName, 'GET', checkoutIntegration, true);
		props.apiStack.addMethodOnResource(Constants.checkoutAuthResourceName, 'POST', checkoutIntegration, true);
		props.apiStack.addMethodOnResource(Constants.checkoutAuthResourceName, 'PUT', checkoutIntegration, true);
		props.apiStack.addMethodOnResource(Constants.checkoutAuthResourceName, 'DELETE', checkoutIntegration, true);

		// Lambda: Product Search Index regeneration
		const productSearchIndexLambda = new NodejsFunction(this, 'ProductSearchIndexFunction', {
			functionName: 'ProductSearchIndexFunction',
			entry: path.join(__dirname, '..', 'lambda', 'Product', 'SearchIndex.ts'),
			handler: 'Handle',
			runtime: Lambda.Runtime.NODEJS_22_X,
			environment: {
				PRODUCT_TABLE: this._productTable.tableName,
				SEARCH_INDEX_BUCKET: props.memoryBucket.bucketName,
				SEARCH_INDEX_KEY: Constants.productSearchIndexObjectKey,
			},
			bundling: { minify: true, sourceMap: true, target: 'node22' },
		});
		this._productTable.grantReadData(productSearchIndexLambda);
		props.memoryBucket.grantPut(productSearchIndexLambda);

		const productSearchIndexIntegration = new LambdaIntegration(productSearchIndexLambda);
		props.apiStack.addMethodOnResource(Constants.productSearchIndexResourceName, 'POST', productSearchIndexIntegration, true);
	}
}