/**
 * Exception thrown when a user is trying to signup.
 * This typically occurs when a user tries to sign up but a user with the same username already exists.
 */
export default class UserAlreadyExistsException extends Error {
    constructor(message: string = "User with the given username already exists.") {
        super(message);
        this.name = "UserAlreadyExistsException";
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UserAlreadyExistsException);
        }
    }
}
