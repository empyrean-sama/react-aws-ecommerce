import { App } from 'aws-cdk-lib';

import AuthStack from './stack/AuthStack.cts';
import APIStack from './stack/APIStack';
import ProfileStack from './stack/ProfileStack';
import MemoryStack from './stack/MemoryStack';
import ProductStack from './stack/ProductStack';

import Constants from './InfrastructureConstants';

const app = new App();

const authStack = new AuthStack(app, Constants.authStackOutputKey);
const apiStack = new APIStack(app, Constants.apiStackOutputKey, {
    userPool: authStack.userPool,
});

// Create Profile Stack to manage user profiles
new ProfileStack(app, Constants.profileStackOutputKey, {
    profilesTable: authStack.profilesTable,
    apiStack: apiStack,
});

// Create Memory Stack to host public-read assets
new MemoryStack(app, Constants.memoryStackOutputKey, { apiStack });

// Create Product Stack to host product/collection/variant APIs and tables
new ProductStack(app, Constants.productStackOutputKey, { apiStack });