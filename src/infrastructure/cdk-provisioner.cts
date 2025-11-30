import { App } from 'aws-cdk-lib';
import AuthStack from './stack/AuthStack.cts';
import APIStack from './stack/APIStack';
import Constants from './Constants';

const app = new App();
const authStack = new AuthStack(app, Constants.authStackOutputKey);
new APIStack(app, Constants.apiStackOutputKey, {
    userPool: authStack.userPool,
    profilesTable: authStack.profilesTable,
});