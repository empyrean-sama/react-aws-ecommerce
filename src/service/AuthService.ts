import OutputParser from "./OutputParser";
import { isEmailValid, isPhoneValid } from "../Helper";

import { Amplify } from "aws-amplify";
import { signUp, SignUpOutput, confirmSignUp, resendSignUpCode, signIn, signOut, getCurrentUser, resetPassword, confirmResetPassword, signInWithRedirect, fetchAuthSession } from "@aws-amplify/auth";

import ISignUpInput from "../interface/ISignUpInput";
import ISignUpOptions from "../interface/ISignUpOptions";
import IUserDetails from "../interface/IUserDetails";

import UserNotVerifiedException from "../error/UserNotVerifiedException";
import UserAlreadyExistsException from "../error/UserAlreadyExistsException";
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
            const emailCheck = isEmailValid(input.username);
            const phoneCheck = isPhoneValid(input.username);
            // Normalize email usernames to lowercase to ensure case-insensitive handling
            const normalizedUsername = emailCheck.isValid ? input.username.trim().toLowerCase() : input.username.trim();
            if(emailCheck.isValid) {
                options.userAttributes.email = normalizedUsername;
            }
            else if(phoneCheck.isValid) {
                options.userAttributes.phone_number = input.username;
            }
            else {
                throw new Error("Invalid username. Must be a valid email or phone number.");
            }

        // Proceed with sign up once attributes are set
        try{
            return await signUp({
                username: normalizedUsername,
                password: input.password,
                options: options
            });
        }
        catch(error) {
            if (error instanceof Error && error.message.includes("User already exists")) {
                throw new UserAlreadyExistsException();
            }
            throw error;
        }
    }

    /**
     * Confirms user sign up with the verification code.
     * @param username: string - user's email address
     * @param code: string - verification code sent to user's email
     * @returns Promise<void>
     * @throws Error for any errors encountered during confirmation
     */
    public async verifyUserAccount(username: string, code: string): Promise<void> {
        const emailCheck = isEmailValid(username);
        const normalizedUsername = emailCheck.isValid ? username.trim().toLowerCase() : username.trim();
        await confirmSignUp({ username: normalizedUsername, confirmationCode: code });
    }

    /**
     * TODO: see if something needs to change for handling phone number verification
     * resend's the verification code to the user's email.
     * @param username string - user's email address
     * @returns Promise<void>
     * @throws Error for any errors encountered during resending the verification code
     */
    public async resendVerificationCode(username: string): Promise<void> {
        const emailCheck = isEmailValid(username);
        const normalizedUsername = emailCheck.isValid ? username.trim().toLowerCase() : username.trim();
        await resendSignUpCode({ username: normalizedUsername });
    }

    /**
     * Signs in a user with the given credentials.
     * @param username: string - username (email or phone)
     * @param password: string - user's password
     * @returns Promise<IUserDetails> - user details object upon successful sign-in
     * @throws Error for any other errors encountered during sign-in
     */
    public async signIn(username: string, password: string): Promise<IUserDetails> {
        const emailCheck = isEmailValid(username);
        const normalizedUsername = emailCheck.isValid ? username.trim().toLowerCase() : username.trim();
        await signIn({ username: normalizedUsername, password });
        return await this.generateUserDetailsFromSession();
    }

    /**
     * Checks if the username (email or phone) is verified.
     * @returns boolean indicating if the username (email or phone) is verified
     * @throws Error for any errors encountered during the check
     */
    public async getUsernameVerificationStatus(): Promise<boolean> {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;

        if (!idToken) {
            throw new Error("Failed to retrieve authentication session");
        }

        // Check if email is verified
        const emailVerified = idToken.payload.email_verified as boolean | undefined;
        const phoneVerified = idToken.payload.phone_number_verified as boolean | undefined;

        return emailVerified === true || phoneVerified === true;
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
     * Gets the current authenticated user's JWT token.
     * @returns Promise<string | null> - the raw JWT (id token preferred) or null if no user session.
     * ! This will ignore any errors and just return null
     */
    public async getCurrentUserToken(): Promise<string | null> {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken;
            if (idToken) {
                return idToken.toString();
            }
            const accessToken = session.tokens?.accessToken;
            if (accessToken) {
                return accessToken.toString();
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Start the password reset process for the given username.
     * @param username: the username (email or phone) of the user to reset password for
     */
    public async resetPassword(username: string): Promise<void> {
        const emailCheck = isEmailValid(username);
        const normalizedUsername = emailCheck.isValid ? username.trim().toLowerCase() : username.trim();
        await resetPassword({username: normalizedUsername});
    }

    /**
     * Confirm the password reset for the given username.
     * @param username: the username (email or phone) of the user to reset password for
     * @param verificationCode: the verification code sent to the user
     * @param newPassword: the new password to set
     */
    public async confirmResetPassword(username: string, verificationCode: string, newPassword: string): Promise<void> {
        const emailCheck = isEmailValid(username);
        const normalizedUsername = emailCheck.isValid ? username.trim().toLowerCase() : username.trim();
        await confirmResetPassword({username: normalizedUsername, newPassword, confirmationCode: verificationCode});
    }

    /**
     * calls the fetch function with the current user's auth token in the Authorization header
     * @param url: the URL to fetch
     * @param init: optional fetch init parameters (will call 'GET' if not provided)
     * @returns whatever fetch returns
     */
    public async authorizedFetch(url: URL, init?: RequestInit): Promise<Response> {
        const token = await AuthService.getInstance().getCurrentUserToken();
        const headers = new Headers(init?.headers || {});
        if (token) {
            headers.set('Authorization', token);
            return await fetch(url.toString(), { ...init, headers });
        }
        throw new Error('User is not authenticated');
    }

    /**
     * Generates the user details from the current authentication session.
     * @returns the user details object
     * @throws Error if unable to retrieve the authentication session
     */
    private async generateUserDetailsFromSession(): Promise<IUserDetails> {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        if (!idToken) {
            throw new UserNotVerifiedException("The user is not verified.");
        }
        // Generate user details object
        const userDetails: IUserDetails = {
            userId: idToken.payload.sub as string,
            username: idToken.payload["cognito:username"] as string,
            email: idToken.payload.email as string | undefined,
            emailVerified: idToken.payload.email_verified as boolean | undefined,
            phoneNumber: idToken.payload.phone_number as string | undefined,
            phoneNumberVerified: idToken.payload.phone_number_verified as boolean | undefined,
            givenName: idToken.payload.given_name as string | undefined,
            familyName: idToken.payload.family_name as string | undefined,
        };
        return userDetails;
    }
}