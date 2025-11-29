/**
 * function to validate email format
 * @param email the email address to validate
 * @returns tuple [isValid, errorMessage] - errorMessage is empty string if valid
 */
export function isEmailValid(email: string): {isValid: boolean, errorMessage: string} {
    if (!email || email.trim() === "") {
        return {isValid: false, errorMessage: "Email address is required"};
    }

    if (email.length > 254) {
        return {isValid: false, errorMessage: "Email address is too long (maximum 254 characters)"};
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
        if (!email.includes('@')) {
            return {isValid: false, errorMessage: "Email address must contain an '@' symbol"};
        }
        if (email.indexOf('@') === 0) {
            return {isValid: false, errorMessage: "Email address cannot start with '@'"};
        }
        if (email.indexOf('@') === email.length - 1) {
            return {isValid: false, errorMessage: "Email address must have a domain after '@'"};
        }
        if (!email.split('@')[1]?.includes('.')) {
            return {isValid: false, errorMessage: "Email domain must contain a period (e.g., example.com)"};
        }
        return {isValid: false, errorMessage: "Email address format is invalid (e.g., user@example.com)"};
    }
    return {isValid: true, errorMessage: ""};
}

/**
 * function to validate phone number format (E.164 format)
 * @param phone the phone number to validate
 * @returns tuple [isValid, errorMessage] - errorMessage is empty string if valid
 */
export function isPhoneValid(phone: string): {isValid: boolean, errorMessage: string} {
    if (!phone || phone.trim() === "") {
        return {isValid: false, errorMessage: "Phone number is required"};
    }

    // Remove all whitespace and common separators for validation
    const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    if (cleanedPhone.length === 0) {
        return {isValid: false, errorMessage: "Phone number cannot be empty"};
    }

    // E.164 format: +[country code][number] (1-15 digits total)
    const e164Regex = /^\+[1-9]\d{1,14}$/;

    if (!e164Regex.test(cleanedPhone)) {
        if (!cleanedPhone.startsWith('+')) {
            return {isValid: false, errorMessage: "Phone number must start with '+' and country code (e.g., +1234567890)"};
        }
        if (cleanedPhone.length < 8) {
            return {isValid: false, errorMessage: "Phone number is too short (minimum 8 characters including '+')"};
        }
        if (cleanedPhone.length > 16) {
            return {isValid: false, errorMessage: "Phone number is too long (maximum 15 digits plus '+')"};
        }
        if (!/^\+\d+$/.test(cleanedPhone)) {
            return {isValid: false, errorMessage: "Phone number must contain only digits after the '+' sign"};
        }
        if (/^\+0/.test(cleanedPhone)) {
            return {isValid: false, errorMessage: "Country code cannot start with 0"};
        }
        return {isValid: false, errorMessage: "Phone number format is invalid (use E.164 format: +1234567890)"};
    }
    return {isValid: true, errorMessage: ""};
}

/**
 * function to validate Cognito verification code format
 * @param code the verification code to validate
 * @returns tuple [isValid, errorMessage] - errorMessage is empty string if valid
 */
export function isVerificationCodeValid(code: string): {isValid: boolean, errorMessage: string} {
    if (!code || code.trim() === "") {
        return {isValid: false, errorMessage: "Verification code is required"};
    }

    // Remove whitespace and common separators
    const cleanedCode = code.replace(/[\s\-]/g, '');

    if (cleanedCode.length === 0) {
        return {isValid: false, errorMessage: "Verification code cannot be empty"};
    }

    // Cognito verification codes are typically 6 digits
    if (!/^\d+$/.test(cleanedCode)) {
        return {isValid: false, errorMessage: "Verification code must contain only numbers"};
    }

    if (cleanedCode.length < 6) {
        return {isValid: false, errorMessage: "Verification code is too short (must be 6 digits)"};
    }

    if (cleanedCode.length > 6) {
        return {isValid: false, errorMessage: "Verification code is too long (must be 6 digits)"};
    }
    return {isValid: true, errorMessage: ""};
}

/**
 * function to validate username (can be either email or phone number)
 * @param username the username to validate
 * @returns object {isValid, errorMessage} - errorMessage is empty string if valid
 */
export function isUsernameValid(username: string): {isValid: boolean, errorMessage: string} {
    if (!username || username.trim() === "") {
        return {isValid: false, errorMessage: "Username is required"};
    }

    const trimmedUsername = username.trim();

    // Check if it's an email
    const emailResult = isEmailValid(trimmedUsername);
    if (emailResult.isValid) {
        return {isValid: true, errorMessage: ""};
    }

    // Check if it's a phone number
    const phoneResult = isPhoneValid(trimmedUsername);
    if (phoneResult.isValid) {
        return {isValid: true, errorMessage: ""};
    }

    // If neither email nor phone is valid, return a combined error message
    return {
        isValid: false, 
        errorMessage: "Username must be a valid email address (e.g., user@example.com) or phone number (e.g., +1234567890)"
    };
}

/**
 * function to validate first name (given name)
 * @param firstName the first name to validate
 * @returns object {isValid, errorMessage} - errorMessage is empty string if valid
 */
export function isFirstNameValid(firstName: string): {isValid: boolean, errorMessage: string} {
    if (!firstName || firstName.trim() === "") {
        return {isValid: false, errorMessage: "First name is required"};
    }

    const trimmedFirstName = firstName.trim();

    if (trimmedFirstName.length < 1) {
        return {isValid: false, errorMessage: "First name cannot be empty"};
    }

    if (trimmedFirstName.length > 128) {
        return {isValid: false, errorMessage: "First name is too long (maximum 128 characters)"};
    }

    // Allow letters, spaces, hyphens, and apostrophes (common in names)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(trimmedFirstName)) {
        return {isValid: false, errorMessage: "First name can only contain letters, spaces, hyphens, and apostrophes"};
    }

    // Check for consecutive spaces or special characters
    if (/\s{2,}/.test(trimmedFirstName)) {
        return {isValid: false, errorMessage: "First name cannot contain consecutive spaces"};
    }

    if (/[-']{2,}/.test(trimmedFirstName)) {
        return {isValid: false, errorMessage: "First name cannot contain consecutive hyphens or apostrophes"};
    }

    return {isValid: true, errorMessage: ""};
}

/**
 * function to validate last name (family name)
 * @param lastName the last name to validate
 * @returns object {isValid, errorMessage} - errorMessage is empty string if valid
 */
export function isLastNameValid(lastName: string): {isValid: boolean, errorMessage: string} {
    if (!lastName || lastName.trim() === "") {
        return {isValid: false, errorMessage: "Last name is required"};
    }

    const trimmedLastName = lastName.trim();

    if (trimmedLastName.length < 1) {
        return {isValid: false, errorMessage: "Last name cannot be empty"};
    }

    if (trimmedLastName.length > 128) {
        return {isValid: false, errorMessage: "Last name is too long (maximum 128 characters)"};
    }

    // Allow letters, spaces, hyphens, and apostrophes (common in names)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(trimmedLastName)) {
        return {isValid: false, errorMessage: "Last name can only contain letters, spaces, hyphens, and apostrophes"};
    }

    // Check for consecutive spaces or special characters
    if (/\s{2,}/.test(trimmedLastName)) {
        return {isValid: false, errorMessage: "Last name cannot contain consecutive spaces"};
    }

    if (/[-']{2,}/.test(trimmedLastName)) {
        return {isValid: false, errorMessage: "Last name cannot contain consecutive hyphens or apostrophes"};
    }

    return {isValid: true, errorMessage: ""};
}

/**
 * function to validate password according to Cognito password policy
 * Requirements: min 8 chars, at least 1 lowercase, 1 uppercase, 1 digit
 * @param password the password to validate
 * @returns object {isValid, errorMessage} - errorMessage is empty string if valid
 */
export function isPasswordValid(password: string): {isValid: boolean, errorMessage: string} {
    if (!password || password.trim() === "") {
        return {isValid: false, errorMessage: "Password is required"};
    }

    if (password.length < 8) {
        return {isValid: false, errorMessage: "Password must be at least 8 characters long"};
    }

    if (!/[a-z]/.test(password)) {
        return {isValid: false, errorMessage: "Password must contain at least one lowercase letter"};
    }

    if (!/[A-Z]/.test(password)) {
        return {isValid: false, errorMessage: "Password must contain at least one uppercase letter"};
    }

    if (!/\d/.test(password)) {
        return {isValid: false, errorMessage: "Password must contain at least one digit"};
    }

    return {isValid: true, errorMessage: ""};
}