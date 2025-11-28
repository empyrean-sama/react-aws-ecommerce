export default interface IUserDetails {
    userId: string;
    username: string;
    email?: string;
    emailVerified?: boolean;
    phoneNumber?: string;
    phoneNumberVerified?: boolean;
    givenName?: string;
    familyName?: string;
}