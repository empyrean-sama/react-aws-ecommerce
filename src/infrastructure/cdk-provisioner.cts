import { App } from 'aws-cdk-lib';

import AuthStack from './stack/AuthStack.cts';
import APIStack from './stack/APIStack';
import ProfileStack from './stack/ProfileStack';
import MemoryStack from './stack/MemoryStack';
import ProductStack from './stack/ProductStack';

import Constants from './InfrastructureConstants';

const app = new App();

const env = { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: Constants.region 
};

const authStack = new AuthStack(app, Constants.authStackOutputKey, { env });
const apiStack = new APIStack(app, Constants.apiStackOutputKey, { userPool: authStack.userPool, env });

// Create Profile Stack to manage user profiles
new ProfileStack(app, Constants.profileStackOutputKey, { profilesTable: authStack.profilesTable, apiStack: apiStack, env });

// Create Memory Stack to host public-read assets
new MemoryStack(app, Constants.memoryStackOutputKey, { apiStack, env });

// Create Product Stack to host product/collection/variant APIs and tables
new ProductStack(app, Constants.productStackOutputKey, { apiStack, env });