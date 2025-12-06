import { JsonLike } from "../Helper";
import IAddress from "../../../interface/IAddress";

/**
 * Gets an IAddress from a JsonLike object, or null if invalid
 * @param obj: the JsonLike object to extract the address from 
 * @returns an IAddress or null if invalid
 */
export function getAddressFromJSONLike(obj: JsonLike | undefined): IAddress | null {
	if (!obj || typeof obj !== 'object') return null;

	const requiredKeys: (keyof IAddress)[] = [
		'userLabel',
		'specificAddress',
		'street',
		'area',
		'postcode',
		'city',
		'state',
		'country',
	];

	for (const key of requiredKeys) {
		if (!(key in obj)) return null;
		const value = obj[key];
		if (typeof value !== 'string' || !value.trim()) return null;
	}

	const address: IAddress = {
		userLabel: String(obj.userLabel).trim(),
		specificAddress: String(obj.specificAddress).trim(),
		street: String(obj.street).trim(),
		area: String(obj.area).trim(),
		postcode: String(obj.postcode).trim(),
		city: String(obj.city).trim(),
		state: String(obj.state).trim(),
		country: String(obj.country).trim(),
	};

	if (obj.latitude !== undefined) {
		const lat = Number(obj.latitude);
		if (!Number.isNaN(lat)) address.latitude = lat;
	}

	if (obj.longitude !== undefined) {
		const lon = Number(obj.longitude);
		if (!Number.isNaN(lon)) address.longitude = lon;
	}

	return address;
}