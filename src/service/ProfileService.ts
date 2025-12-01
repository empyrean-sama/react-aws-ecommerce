import { JsonLike } from "../infrastructure/lambda/Helper";
import IAddress from "../interface/IAddress";
import IAddressRecord from "../interface/IAddressRecord";
import AuthService from "./AuthService";
import OutputParser from "./OutputParser";

export default class ProfileService {
    private static _instance : ProfileService | null = null;
    private constructor() {}
    public static getInstance(): ProfileService {
        if (this._instance === null) {
            this._instance = new ProfileService();
        }
        return this._instance;
    }

    /**
     * Get a specific address by its addressId 
     * TODO: why is this even needed? should just use getAddressesByUserId and filter locally
     * @param addressId The ID of the address to retrieve
     * @returns IAddressRecord | null if not found
     */
    public async getAddressById(addressId: string): Promise<IAddressRecord | null> {
        const url = new URL(OutputParser.AddressesEndPointURL);
        url.searchParams.set('addressId', addressId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'GET' });
        const json = await resp.json();
        if (!resp.ok) {
            return null;
        }
        return json as IAddressRecord;
    }

    /**
     * Get all addresses associated with a specific userId
     * @param userId The ID of the user whose addresses to retrieve
     * @returns IAddressRecord[] An array of address records associated with the userId or null if error
     */
    public async getAddressesByUserId(userId: string): Promise<IAddressRecord[] | null> {
        const url = new URL(OutputParser.AddressesEndPointURL);
        url.searchParams.set('userId', userId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'GET' });
        const json = await resp.json();
        if (!resp.ok) {
            return null;
        }
        return json.addresses as IAddressRecord[];
    }

    /**
     * Adds a new address for the currently authenticated user.
     * @param address The IAddress to add
     * @returns The added IAddressRecord
     */
    public async addAddress(address: IAddress): Promise<IAddressRecord> {
        const url = new URL(OutputParser.AddressesEndPointURL);
        const currentUser = await AuthService.getInstance().getCurrentUser();
        if (!currentUser?.userId) {
            throw new Error('User not authenticated');
        }

        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.userId,
                address,
            }),
        });

        const json = await resp.json();
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to add address');
        }
        return (json.addressRecord) as IAddressRecord;
    }

    /**
     * Update an existing address by its addressId
     * @param addressId: string The ID of the address to update
     * @param address: IAddress The new address data
     * @returns The updated IAddressRecord
     */
    public async updateAddress(addressId: string, address: IAddress): Promise<IAddressRecord> {
        const url = new URL(OutputParser.AddressesEndPointURL);
        const currentUser = await AuthService.getInstance().getCurrentUser();
        if (!currentUser?.userId) {
            throw new Error('User not authenticated');
        }
        
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                addressId,
                address,
            }),
        });
        const json = await resp.json();
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to update address');
        }
        return json.addressRecord as IAddressRecord;
    }

    /**
     * Delete an address by its addressId
     * @param addressId The ID of the address to delete
     */
    public async deleteAddress(addressId: string): Promise<void> {
        const url = new URL(OutputParser.AddressesEndPointURL);
        url.searchParams.set('addressId', addressId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'DELETE' });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined);
            throw new Error(json?.message || 'Failed to delete address');
        }
    }

    /**
     * Get autofill address suggestions from my proxy lambda
     * @param text: the text to get suggestions for
     * @returns all suggestions or null if error
     */
    public async getAutofillAddressSuggestions(text: string): Promise<JsonLike | null> {
        const url = new URL(OutputParser.AutofillAddressEndPointURL);
        url.searchParams.set('text', text);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'GET' });
        const json = await resp.json();
        if (!resp.ok) {
            return null;
        }
        return json as JsonLike;    
    }
}