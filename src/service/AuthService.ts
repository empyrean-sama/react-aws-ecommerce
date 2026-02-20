import CryptoJS from "crypto-js";
import OutputParser from "./OutputParser";
import { isEmailValid, isPhoneValid } from "../Helper";
import ProjectConstants from "../Constants";

import { Amplify } from "aws-amplify";
import { signUp, SignUpOutput, confirmSignUp, resendSignUpCode, signIn, signOut, getCurrentUser, resetPassword, confirmResetPassword, fetchAuthSession, updatePassword, updateUserAttributes, signInWithRedirect } from "@aws-amplify/auth";

import ISignUpInput from "../interface/ISignUpInput";
import ISignUpOptions from "../interface/ISignUpOptions";
import IUserDetails from "../interface/IUserDetails";

import UserNotVerifiedException from "../error/UserNotVerifiedException";
import UserAlreadyExistsException from "../error/UserAlreadyExistsException";
import Constants from "../Constants";
import ProductService from "./ProductService";
import ICartEntryRecord from "../interface/product/ICartEntryRecord";
import ICartEntry, { ICartEntryItem } from "../interface/product/ICartEntry";
import IProductRecord from "../interface/product/IProductRecord";
import IProductVariantRecord from "../interface/product/IProductVariantRecord";
export default class AuthService {

    private static _instance: AuthService;
    private constructor() {
        const userPoolId = OutputParser.UserPoolId;
        const userPoolClientId = OutputParser.UserPoolClientId;
        const hostedUiDomain = OutputParser.UserPoolHostedUiDomain;

        const loginWith: any = {
            email: true,
            phone: false //todo: must make phone true before shipping version- 1
        };

        if (hostedUiDomain) {
            const baseOrigin = window.location.origin;
            loginWith.oauth = {
                domain: hostedUiDomain.replace(/^https?:\/\//, ''),
                scopes: ['openid', 'email', 'profile'],
                redirectSignIn: [
                    `${baseOrigin}/account`,
                    `${baseOrigin}/account/login`,
                    `${baseOrigin}/account/signup`,
                ],
                redirectSignOut: [`${baseOrigin}/`],
                responseType: 'code',
            };
        }

        Amplify.configure({
            Auth: {
                Cognito: {
                    userPoolId: userPoolId,
                    userPoolClientId: userPoolClientId,
                    loginWith,
                }
            }
        });
    }

    /**
     * Whether Google OAuth has been configured in deployed infrastructure.
     */
    public isGoogleFederationEnabled(): boolean {
        return OutputParser.IsGoogleFederationEnabled && !!OutputParser.UserPoolHostedUiDomain;
    }

    /**
     * Redirect user to Cognito Hosted UI Google login/signup.
     */
    public async signInWithGoogle(redirectPath: string = '/account'): Promise<void> {
        if (!this.isGoogleFederationEnabled()) {
            throw new Error('Google sign-in is not configured yet.');
        }

        await signInWithRedirect({
            provider: 'Google',
            options: {},
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
    public async getCurrentUser(forceRefresh: boolean = false): Promise<IUserDetails | null> {
        try {
            const { username, userId } = await getCurrentUser();
            const session = await fetchAuthSession({ forceRefresh });
            
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
     * Gets the current authenticated user's Cognito groups from the ID token.
     * @returns string[] of groups (e.g. ['admin'])
     */
    public async getCurrentUserGroups(): Promise<string[]> {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken;
            const payload: any = idToken?.payload;
            const groupsRaw = payload?.['cognito:groups'] ?? payload?.groups;
            if (!groupsRaw) return [];
            if (Array.isArray(groupsRaw)) return groupsRaw.map(String);
            if (typeof groupsRaw === 'string') {
                try {
                    const parsed = JSON.parse(groupsRaw);
                    if (Array.isArray(parsed)) return parsed.map(String);
                } catch {
                    // ignore
                }
                return groupsRaw.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [];
        } catch {
            return [];
        }
    }

    /**
     * Checks whether the current user is in the admin group.
     */
    public async isCurrentUserAdmin(): Promise<boolean> {
        const groups = await this.getCurrentUserGroups();
        return groups.includes('admin');
    }

    /**
     * Start the password reset process for the given username.
     * @param username: the username (email or phone) of the user to reset password for
     */
    public async resetPassword(username: string): Promise<void> {
        const emailCheck = isEmailValid(username);
        const normalizedUsername = emailCheck.isValid ? username.trim().toLowerCase() : username.trim();

        try {
            await resetPassword({username: normalizedUsername});
        } catch (error: unknown) {
            const name = (error as { name?: unknown })?.name;
            if (name === 'InvalidParameterException' ) {
                throw new UserNotVerifiedException('Your account is not verified yet. Please verify your account first.');
            }
            throw error;
        }
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
     * Updates the user's profile attributes.
     * @param attributes The attributes to update (e.g., given_name, family_name)
     */
    public async updateProfile(oldPassword: string, attributes: { givenName?: string; familyName?: string }): Promise<void> {

		const isPasswordValid = await this.verifyPassword(oldPassword);
        if (!isPasswordValid) {
            throw new Error("Current password is incorrect.");
        }

        const userAttributes: Record<string, string> = {};
        if (attributes.givenName) userAttributes.given_name = attributes.givenName;
        if (attributes.familyName) userAttributes.family_name = attributes.familyName;
        if (Object.keys(userAttributes).length > 0) {
            await updateUserAttributes({ userAttributes });
        }
    }

    /**
     * Updates the user's password.
     * @param oldPassword The current password
     * @param newPassword The new password
     */
    public async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
        await updatePassword({ oldPassword, newPassword });
    }

    /**
     * Verify whether the provided password matches the currently signed-in user.
     *
     * Cognito/Amplify does not provide a pure client-side "check password" API while
     * keeping the current session intact. This method calls a protected backend
     * endpoint that performs a Cognito InitiateAuth and returns { ok: boolean }.
     */
    public async verifyPassword(password: string): Promise<boolean> {
        const resp = await this.authorizedFetch(OutputParser.VerifyPasswordEndPointURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(text || 'Password verification failed');
        }
        const data = await resp.json() as { ok?: boolean };
        return data.ok === true;
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
     * Upload an image to S3 using a presigned URL.
     * - Requests a presigned URL from the backend (admin-only).
     * - Validates file size and type client-side.
     * - Computes base64 Content-MD5 for integrity and binds upload to exact bytes.
     * @param file: the image File selected by the user
     * @returns the S3 object key string if upload succeeds
     * @throws Error if unauthorized or upload fails
     */
    public async uploadImage(file: File): Promise<string> {
        // Validate client-side constraints (mirror backend)
        const maxBytes = ProjectConstants.IMAGE_UPLOAD_MAX_BYTES;
        if (file.size <= 0 || file.size > maxBytes) {
            throw new Error(`Invalid file size. Max ${maxBytes} bytes`);
        }
        const type = file.type || '';
        if (!Constants.IMAGE_UPLOAD_ALLOWED_TYPES.includes(type)) {
            throw new Error('Unsupported image type');
        }

        // Compute base64 MD5 of the exact bytes
        const arrayBuffer = await file.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
        const md5Digest = CryptoJS.MD5(wordArray);
        const contentMd5 = CryptoJS.enc.Base64.stringify(md5Digest);

        // Request presigned URL
        const requestBody = {
            fileName: file.name,
            contentType: type,
            contentMd5,
            contentLength: file.size,
        };
        const presignResponse = await this.authorizedFetch(OutputParser.UploadToMemoryEndPointURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        if (!presignResponse.ok) {
            const text = await presignResponse.text();
            throw new Error(text || 'Failed to get upload URL');
        }
        const presignData = await presignResponse.json() as {
            uploadUrl: string;
            key: string;
            requiredHeaders: { ['Content-Type']: string; ['Content-MD5']: string };
        };

        // PUT the file to S3 using the presigned URL
        const putResp = await fetch(presignData.uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': presignData.requiredHeaders['Content-Type'],
                'Content-MD5': presignData.requiredHeaders['Content-MD5'],
            },
            body: file,
        });
        if (!putResp.ok) {
            const errText = await putResp.text();
            throw new Error(errText || 'Upload failed');
        }
        return presignData.key;
    }

    private normalizeLocalCartProducts(rawCart: unknown): ICartEntryItem[] {
        const candidateItems = Array.isArray(rawCart)
            ? rawCart
            : (typeof rawCart === 'object' && rawCart !== null && Array.isArray((rawCart as { products?: unknown }).products)
                ? (rawCart as { products: unknown[] }).products
                : []);

        return candidateItems
            .map((item: any) => ({
                productId: String(item?.productId ?? ''),
                quantity: Math.floor(Number(item?.quantity ?? 0)),
                variantId: String(item?.variantId ?? ''),
            }))
            .filter((item) => item.productId.length > 0 && item.variantId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);
    }

    private async sanitizeGuestCartProducts(localProducts: ICartEntryItem[]): Promise<{ products: ICartEntryItem[]; cartAdjusted: boolean }> {
        if (localProducts.length === 0) {
            return { products: [], cartAdjusted: false };
        }

        const mergedByItemKey = new Map<string, ICartEntryItem>();
        for (const item of localProducts) {
            const key = `${item.productId}::${item.variantId}`;
            const existing = mergedByItemKey.get(key);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                mergedByItemKey.set(key, { ...item });
            }
        }

        const mergedItems = Array.from(mergedByItemKey.values());
        const uniqueProductIds = Array.from(new Set(mergedItems.map((item) => item.productId)));
        const productService = ProductService.getInstance();

        const catalogByProductId = new Map<string, { product: IProductRecord | null | undefined; variants: IProductVariantRecord[] | null | undefined }>();
        await Promise.all(uniqueProductIds.map(async (productId) => {
            try {
                const [product, variants] = await Promise.all([
                    productService.getProductById(productId),
                    productService.getVariantsByProductId(productId),
                ]);
                catalogByProductId.set(productId, { product, variants });
            } catch {
                catalogByProductId.set(productId, { product: undefined, variants: undefined });
            }
        }));

        let cartAdjusted = mergedItems.length !== localProducts.length;
        const sanitizedProducts: ICartEntryItem[] = [];

        for (const item of mergedItems) {
            const catalog = catalogByProductId.get(item.productId);
            if (!catalog) {
                cartAdjusted = true;
                continue;
            }

            if (catalog.product === null || catalog.variants === null) {
                cartAdjusted = true;
                continue;
            }

            if (!catalog.product || !catalog.variants) {
                sanitizedProducts.push(item);
                continue;
            }

            const matchingVariant = catalog.variants.find((variant) => variant.variantId === item.variantId);
            if (!matchingVariant) {
                cartAdjusted = true;
                continue;
            }

            const stockLimit = Number.isFinite(matchingVariant.stock) ? Math.max(0, Math.floor(matchingVariant.stock)) : 0;
            const perOrderLimit = (typeof matchingVariant.maximumInOrder === 'number' && Number.isFinite(matchingVariant.maximumInOrder) && matchingVariant.maximumInOrder >= 0)
                ? Math.floor(matchingVariant.maximumInOrder)
                : Number.MAX_SAFE_INTEGER;
            const allowedQuantity = Math.min(stockLimit, perOrderLimit);

            if (allowedQuantity <= 0) {
                cartAdjusted = true;
                continue;
            }

            const nextQuantity = Math.min(item.quantity, allowedQuantity);
            if (nextQuantity !== item.quantity) {
                cartAdjusted = true;
            }

            sanitizedProducts.push({ ...item, quantity: nextQuantity });
        }

        return { products: sanitizedProducts, cartAdjusted };
    }

    /**
     * Try to Get the user's cart 
     * ! Will make a request to the backend only if the user is authenticated
     * ! Will get cart from local storage if the user is not authenticated
     * @returns the array of cart items
     * @throws Error if unable to retrieve the cart
     */
    public async getCart(): Promise<ICartEntryRecord> {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        
        if(token) {
            const response = await this.authorizedFetch(new URL(OutputParser.CartEndPointURL), {method: 'GET'});
            if(!response.ok) {
                const responseText = await response.text();
                throw new Error(responseText || 'Failed to get cart');
            }
            const data = await response.json();
            return data || [];
        }
        else {
            // The user is not authenticated, check the local storage and return the cart if any
            const localCart = localStorage.getItem(Constants.LOCAL_STORAGE_CART_KEY);
            if(!localCart) {
                return { userId: "localStorage", products: []};
            }

            try {
                const data = JSON.parse(localCart);
                const normalizedProducts = this.normalizeLocalCartProducts(data);
                const sanitizedCart = await this.sanitizeGuestCartProducts(normalizedProducts);
                if (sanitizedCart.cartAdjusted) {
                    localStorage.setItem(Constants.LOCAL_STORAGE_CART_KEY, JSON.stringify(sanitizedCart.products));
                }
                return { userId: "localStorage", products: sanitizedCart.products, cartAdjusted: sanitizedCart.cartAdjusted };
            }
            catch {
                return { userId: "localStorage", products: []};
            }
        }
    }

    /**
     * Try to Set the user's cart
     * ! Will make a request to the backend only if the user is authenticated
     * ! Will set cart in local storage if the user is not authenticated
     * 
     * @returns void
     * @throws Error if unable to update the cart
     */
    public async setCart(items: ICartEntry): Promise<void> {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if(token) {
            const response = await this.authorizedFetch(new URL(OutputParser.CartEndPointURL), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...items })
            });

            if (!response.ok) {
                const responseText = await response.text();
                throw new Error(responseText || 'Failed to update cart');
            }
        }
        else {
            // The user is not authenticated, store cart in local storage
            localStorage.setItem(Constants.LOCAL_STORAGE_CART_KEY, JSON.stringify(items?.products || []));
        }
    }

    /**
     * Try to Update the user's cart
     * ! Will make a request to the backend only if the user is authenticated
     * ! Will set cart in local storage if the user is not authenticated
     * @param items the array of cart items to be updated
     * @returns void
     * @throws an Error if unable to set the cart
     */
    public async updateCart(cartEntry: ICartEntry): Promise<void> {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if(token) {
            // The user is authenticated, update the cart on backend
            const promises = [];
            for(const item of cartEntry.products) {
                const response = this.authorizedFetch(new URL(OutputParser.CartEndPointURL), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...item })
                });
                promises.push(response);
            }
            const responses = await Promise.all(promises);
            for(const response of responses) {
                if (!response.ok) {
                    const responseText = await response.text();
                    throw new Error(responseText || 'Failed to update cart');
                }
            }
        }
        else {
            // The user is not authenticated, update cart in local storage
            const localCart = localStorage.getItem(Constants.LOCAL_STORAGE_CART_KEY);
            let currentItems: ICartEntryItem[] = [];
            if(localCart) {
                try {
                    const data = JSON.parse(localCart);
                    currentItems = this.normalizeLocalCartProducts(data);
                } catch {}
            }
            // Update current items with new items
            for(const newItem of cartEntry.products) {
                const existingIndex = currentItems.findIndex(item => item.productId === newItem.productId && item.variantId === newItem.variantId);
                if(existingIndex >= 0) {
                    // update existing
                    currentItems[existingIndex].quantity = newItem.quantity;
                } else {
                    // add new
                    currentItems.push({ productId: newItem.productId, variantId: newItem.variantId, quantity: newItem.quantity });
                }
            }
            localStorage.setItem(Constants.LOCAL_STORAGE_CART_KEY, JSON.stringify(currentItems));
        }
    }

    /**
     * Try to Delete the user's cart
     * ! Will make a request to the backend only if the user is authenticated
     * ! Will delete cart from local storage if the user is not authenticated
     * @returns void
     * @throws Error if unable to delete the cart
     */
    public async deleteCart(): Promise<void> {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        
        if(token) {
            const response = await this.authorizedFetch(new URL(OutputParser.CartEndPointURL), { method: 'DELETE' });
            if (!response.ok) {
                const responseText = await response.text();
                throw new Error(responseText || 'Failed to delete cart');
            }
        }
        else {
            // The user is not authenticated, remove cart from local storage
            localStorage.removeItem(Constants.LOCAL_STORAGE_CART_KEY);
        }
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