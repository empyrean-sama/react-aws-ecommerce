export default interface IAddress {
    userLabel: string;

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

    /** Provider-specific place id (Photon or Nominatim or Mapbox etc.) */
    placeId?: string;
}

export function createEmptyAddress(): IAddress {
    return {
        userLabel: "",

        specificAddress: "",
        street: "",
        area: "",
        city: "",
        state: "",
        country: "",
        postcode: "",

        latitude: 48.8566, // The latitude of Paris by default
        longitude: 2.3522, // The longitude of Paris by default

        placeId: "",
    };
}