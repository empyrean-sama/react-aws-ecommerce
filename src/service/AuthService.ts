import OutputParser from "./OutputParser";
import { isEmailValid, isPhoneValid } from "../Helper";

import { Amplify } from "aws-amplify";
import { signUp, SignUpOutput, confirmSignUp, resendSignUpCode, signIn, signOut, getCurrentUser, resetPassword, confirmResetPassword, signInWithRedirect, fetchAuthSession } from "@aws-amplify/auth";

import ISignUpInput from "../interface/ISignUpInput";
import ISignUpOptions from "../interface/ISignUpOptions";
import IUserDetails from "../interface/IUserDetails";

import UserNotVerifiedException from "../error/UserNotVerifiedException";
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
        if(isEmailValid(input.username).isValid) {
            options.userAttributes.email = input.username;
        }
        else if(isPhoneValid(input.username).isValid) {
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

    /**
     * Confirms user sign up with the verification code.
     * @param username: string - user's email address
     * @param code: string - verification code sent to user's email
     * @returns Promise<void>
     * @throws Error for any errors encountered during confirmation
     */
    public async verifyUserAccount(username: string, code: string): Promise<void> {
        await confirmSignUp({ username, confirmationCode: code });
    }

    /**
     * todo: see if something needs to change for handling phone number verification
     * resend's the verification code to the user's email.
     * @param username string - user's email address
     * @returns Promise<void>
     * @throws Error for any errors encountered during resending the verification code
     */
    public async resendVerificationCode(username: string): Promise<void> {
        await resendSignUpCode({ username });
    }

    /**
     * Signs in a user with the given credentials.
     * @param username: string - user's email address
     * @param password: string - user's password
     * @returns Promise<void>
     * @throws UserNotVerifiedException if the user has not verified their account
     * @throws Error for any other errors encountered during sign-in
     */
    public async signIn(username: string, password: string): Promise<void> {
        await signIn({ username, password });
        const userDetails = await this.getCurrentUser();
        if(!userDetails) {
            throw new UserNotVerifiedException(`the user with username: ${username} and password ${password} is not verified`);
        }
    }

    /**
     * Signs out the currently authenticated user.
     * @returns Promise<void>
     * @throws Error for any errors encountered during sign-out
     */
    public async signOut(): Promise<void> {
        await signOut();
    }

    /**
     * Gets the currently authenticated user, if any.
     * @returns Promise<IUserDetails | null> - user object or null if not signed in
     * ! This will ignore any errors and just return null
     */
    public async getCurrentUser(): Promise<IUserDetails | null> {
        try {
            const { username, userId } = await getCurrentUser();
            const session = await fetchAuthSession();
            
            // Get user attributes from the ID token
            const idToken = session.tokens?.idToken;
            if (!idToken) {
                return null;
            }

            // Generate user details object
            const userDetails: IUserDetails = {
                userId: userId,
                username: username,
                email: idToken.payload.email as string | undefined,
                emailVerified: idToken.payload.email_verified as boolean | undefined,
                phoneNumber: idToken.payload.phone_number as string | undefined,
                phoneNumberVerified: idToken.payload.phone_number_verified as boolean | undefined,
                givenName: idToken.payload.given_name as string | undefined,
                familyName: idToken.payload.family_name as string | undefined,
            };

            return userDetails;
        } catch (error) {
            return null;
        }
    }

    /**
     * Start the password reset process for the given username.
     * @param username: the username (email or phone) of the user to reset password for
     */
    public async resetPassword(username: string): Promise<void> {
        await resetPassword({username});
    }

    /**
     * Confirm the password reset for the given username.
     * @param username: the username (email or phone) of the user to reset password for
     * @param verificationCode: the verification code sent to the user
     * @param newPassword: the new password to set
     */
    public async confirmResetPassword(username: string, verificationCode: string, newPassword: string): Promise<void> {
        await confirmResetPassword({username, newPassword, confirmationCode: verificationCode});
    }
}