export default interface IAddress {
    userLabel: string;
    phoneNumber: string;

    specificAddress: string;
    street: string;
    area: string;
    postcode: string;
    city: string;
    state: string;
    country: string;

    /** Geographic coordinates (optional) */
    latitude?: number;
    longitude?: number;
}

export function createEmptyAddress(): IAddress {
    return {
        userLabel: "",
        phoneNumber: "",

        specificAddress: "",
        street: "",
        area: "",
        city: "",
        state: "",
        country: "",
        postcode: "",

        latitude: 48.8566, // The latitude of Paris by default
        longitude: 2.3522, // The longitude of Paris by default
    };
}