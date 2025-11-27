import OutputParser from "./OutputParser";
import { Amplify } from "aws-amplify";
import { signUp, SignUpOutput, confirmSignUp, resendSignUpCode, signIn, signOut, getCurrentUser, resetPassword, confirmResetPassword, signInWithRedirect, fetchAuthSession } from "@aws-amplify/auth";
import ISignUpInput from "../interface/ISignUpInput";
import { isEmailValid, isPhoneValid } from "../Helper";
import ISignUpOptions from "../interface/ISignUpOptions";

export default class AuthService {

    private static _instance: AuthService;
    private constructor() {
        const userPoolId = OutputParser.UserPoolId;
        const userPoolClientId = OutputParser.UserPoolClientId;

        Amplify.configure({
            Auth: {
                Cognito: {
                    userPoolId: userPoolId,
                    userPoolClientId: userPoolClientId,
                    loginWith: {
                        email: true,
                        phone: false //todo: must make phone true before shipping version- 1
                    }
                }
            }
        });
    }

    /**
     * Get the singleton instance of AuthService
     * @returns the AuthService instance
     */
    public static getInstance(): AuthService {
        if (!this._instance) {
            this._instance = new AuthService();
        }
        return this._instance;
    }

    /**
     * Sign up a new user with the provided input
     * @param input the sign up input
     * @returns the sign up output
     */
    public async signUp(input: ISignUpInput): Promise<SignUpOutput> {
        
        // Determine if username is email or phone and set attributes accordingly
        let options: ISignUpOptions = {
            userAttributes: {
                given_name: input.givenName,
                family_name: input.familyName
            }
        }
        if(isEmailValid(input.username)) {
            options.userAttributes.email = input.username;
        }
        else if(isPhoneValid(input.username)) {
            options.userAttributes.phone_number = input.username;
        } else {
            throw new Error("Invalid username format");
        }

        // Proceed with sign up once attributes are set
        return await signUp({
            username: input.username,
            password: input.password,
            options: options
        });
    }
}