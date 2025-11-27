export default interface ISignUpOptions {
    userAttributes: {
        given_name: string;
        family_name: string;
        email?: string;
        phone_number?: string;
    }
}