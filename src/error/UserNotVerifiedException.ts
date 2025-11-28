/**
 * Exception thrown when a user has not verified their account.
 * This typically occurs when a user tries to sign in but hasn't confirmed
 * their email or phone number via the verification code.
 */
export default class UserNotVerifiedException extends Error {
    constructor(message: string = "User account is not verified. Please check your email for a verification code.") {
        super(message);
        this.name = "UserNotVerifiedException";
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UserNotVerifiedException);
        }
    }
}
