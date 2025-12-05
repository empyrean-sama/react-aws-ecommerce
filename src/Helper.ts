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

export function isLabelValid(label: string): {isValid: boolean, errorMessage: string} {
    // Validate address label (e.g., "Home", "Work")
    if (!label || label.trim() === "") {
        return { isValid: false, errorMessage: "Label is required" };
    }

    const trimmed = label.trim();

    // Keep labels reasonably short for UI chips
    if (trimmed.length > 32) {
        return { isValid: false, errorMessage: "Label is too long (maximum 32 characters)" };
    }

    // Allow letters, numbers, spaces and common separators
    const labelRegex = /^[a-zA-Z0-9\s'-]+$/;
    if (!labelRegex.test(trimmed)) {
        return { isValid: false, errorMessage: "Label can contain letters, numbers, spaces, hyphens and apostrophes" };
    }

    return { isValid: true, errorMessage: "" };
}

export function isSpecificAddressValid(specificAddress: string): {isValid: boolean, errorMessage: string} {
    // Validate specific address (flat/door/building)
    if (!specificAddress) {
        // Optional field; treat empty as valid
        return { isValid: true, errorMessage: "" };
    }

    const trimmed = specificAddress.trim();
    if (trimmed.length === 0) {
        return { isValid: true, errorMessage: "" };
    }

    if (trimmed.length > 128) {
        return { isValid: false, errorMessage: "Specific address is too long (maximum 128 characters)" };
    }

    // Allow letters, numbers and common punctuation
    const regex = /^[a-zA-Z0-9\s#'\-/.,]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "Specific address contains invalid characters" };
    }

    return { isValid: true, errorMessage: "" };
}

export function isStreetValid(street: string): {isValid: boolean, errorMessage: string} {
    // Validate street/locality (required)
    if (!street || street.trim() === "") {
        return { isValid: false, errorMessage: "Street / locality is required" };
    }

    const trimmed = street.trim();
    if (trimmed.length > 128) {
        return { isValid: false, errorMessage: "Street / locality is too long (maximum 128 characters)" };
    }

    const regex = /^[a-zA-Z0-9\s'\-/.,]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "Street / locality contains invalid characters" };
    }
    if (/\s{2,}/.test(trimmed)) {
        return { isValid: false, errorMessage: "Street / locality cannot contain consecutive spaces" };
    }
    return { isValid: true, errorMessage: "" };
}

export function isAreaValid(area: string): {isValid: boolean, errorMessage: string} {
    // Validate area (neighborhood) - optional
    if (!area) {
        return { isValid: true, errorMessage: "" };
    }
    const trimmed = area.trim();
    if (trimmed.length === 0) {
        return { isValid: true, errorMessage: "" };
    }
    if (trimmed.length > 128) {
        return { isValid: false, errorMessage: "Area is too long (maximum 128 characters)" };
    }
    const regex = /^[a-zA-Z0-9\s'\-/.,]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "Area contains invalid characters" };
    }
    return { isValid: true, errorMessage: "" };
}

export function isCityValid(city: string): {isValid: boolean, errorMessage: string} {
    // Validate city (required)
    if (!city || city.trim() === "") {
        return { isValid: false, errorMessage: "City is required" };
    }
    const trimmed = city.trim();
    if (trimmed.length > 128) {
        return { isValid: false, errorMessage: "City is too long (maximum 128 characters)" };
    }
    const regex = /^[a-zA-Z\s'\-]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "City can only contain letters, spaces, hyphens and apostrophes" };
    }
    return { isValid: true, errorMessage: "" };
}

export function isStateValid(state: string): {isValid: boolean, errorMessage: string} {
    // Validate state/province (required)
    if (!state || state.trim() === "") {
        return { isValid: false, errorMessage: "State / province is required" };
    }
    const trimmed = state.trim();
    if (trimmed.length > 128) {
        return { isValid: false, errorMessage: "State / province is too long (maximum 128 characters)" };
    }
    const regex = /^[a-zA-Z\s'\-]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "State / province can only contain letters, spaces, hyphens and apostrophes" };
    }
    return { isValid: true, errorMessage: "" };
}

export function isCountryValid(country: string): {isValid: boolean, errorMessage: string} {
    // Validate country (required)
    if (!country || country.trim() === "") {
        return { isValid: false, errorMessage: "Country is required" };
    }
    const trimmed = country.trim();
    if (trimmed.length > 128) {
        return { isValid: false, errorMessage: "Country is too long (maximum 128 characters)" };
    }
    const regex = /^[a-zA-Z\s'\-]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "Country can only contain letters, spaces, hyphens and apostrophes" };
    }
    return { isValid: true, errorMessage: "" };
}

export function isPostcodeValid(postcode: string): {isValid: boolean, errorMessage: string} {
    // Validate postcode/ZIP (required)
    if (!postcode || postcode.trim() === "") {
        return { isValid: false, errorMessage: "Postcode is required" };
    }
    const trimmed = postcode.trim();

    // Keep generous length range to support global postcodes
    if (trimmed.length < 3) {
        return { isValid: false, errorMessage: "Postcode is too short (minimum 3 characters)" };
    }
    if (trimmed.length > 16) {
        return { isValid: false, errorMessage: "Postcode is too long (maximum 16 characters)" };
    }

    // Allow letters + digits + spaces and common separators
    const regex = /^[A-Za-z0-9\s-]+$/;
    if (!regex.test(trimmed)) {
        return { isValid: false, errorMessage: "Postcode can contain only letters, numbers, spaces and hyphens" };
    }
    return { isValid: true, errorMessage: "" };
}

export function areCoordinatesValid(latitude: number | undefined, longitude: number | undefined): {isValid: boolean, errorMessage: string} {
    // Validate presence
    if (latitude === undefined || longitude === undefined) {
        return { isValid: false, errorMessage: "Coordinates are required" };
    }

    // Validate numeric ranges per WGS84
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return { isValid: false, errorMessage: "Coordinates must be valid numbers" };
    }

    if (latitude < -90 || latitude > 90) {
        return { isValid: false, errorMessage: "Latitude must be between -90 and 90" };
    }
    if (longitude < -180 || longitude > 180) {
        return { isValid: false, errorMessage: "Longitude must be between -180 and 180" };
    }

    return { isValid: true, errorMessage: "" };
}