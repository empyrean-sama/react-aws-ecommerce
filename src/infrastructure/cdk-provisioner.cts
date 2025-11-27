import { App } from 'aws-cdk-lib';
import AuthStack from './stack/AuthStack.cts';;
import Constants from './Constants';

const app = new App();
new AuthStack(app, Constants.authStackOutputKey);