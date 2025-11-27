/**
 * function to validate email format
 * @param email the email address to validate
 * @returns true if the email is valid, false otherwise
 */
export function isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * function to validate phone number format (E.164 format)
 * @param phone the phone number to validate
 * @returns true if the phone number is valid, false otherwise
 */
export function isPhoneValid(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}