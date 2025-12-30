
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import Constants from '../InfrastructureConstants';
import APIStack from './APIStack';

export interface ProductStackProps extends StackProps {
	apiStack: APIStack;
}

export default class ProductStack extends Stack {
	private readonly _collectionTable: DynamoDB.Table;
	private readonly _productTable: DynamoDB.Table;
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
	}
}