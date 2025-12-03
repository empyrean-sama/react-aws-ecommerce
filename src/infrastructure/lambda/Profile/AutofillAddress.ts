/**
 * Autofill Address Lambda function
 *
 * Proxies requests to the Geoapify autocomplete endpoint.
 *
 * API
 * - GET /autofill-address?text={query}
 *
 * Input: API Gateway event
 * Output: APIGatewayProxyResult with JSON body
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { constructResponse, JsonLike } from '../Helper';

// Geoapify API key should be provided via environment variable
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY

// This is the base URL for the Geoapify autocomplete API
const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

export async function Handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
	try {
		if (!GEOAPIFY_API_KEY) {
			console.error('AutofillAddress: GEOAPIFY_API_KEY env var not set');
			return constructResponse(500, { message: 'Server configuration error' });
		}

		const method = event.httpMethod?.toUpperCase();
		if (method !== 'GET') {
			return constructResponse(405, { message: 'Method Not Allowed' });
		}

		const qs = event.queryStringParameters || {};
		const text = qs.text;
		const limit = '5'; //TODO: check if making this configurable is needed in future
		const lang = 'en'; //TODO: make configurable for future

		if (!text || !text.trim()) {
			return constructResponse(400, { message: 'Missing text in query' });
		}

		const url = new URL(GEOAPIFY_BASE_URL);
		url.searchParams.set('text', text);
		url.searchParams.set('limit', limit);
		url.searchParams.set('lang', lang);
		url.searchParams.set('format', 'json');
		url.searchParams.set('apiKey', GEOAPIFY_API_KEY);

		const resp = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			},
		});

		let upstreamResponse: JsonLike;
		try {
			upstreamResponse = await resp.json();
		} catch (e) {
			console.error('AutofillAddress: Failed to parse Geoapify response JSON', e);
			return constructResponse(502, { message: 'Invalid response from upstream service' });
		}

		if (!resp.ok) {
			console.error('AutofillAddress: Geoapify error', resp.status, upstreamResponse);
			return constructResponse(502, { message: 'Failed to fetch autocomplete data' });
		}

		return constructResponse(200, upstreamResponse);
	}
	catch (error) {
		console.error('AutofillAddress error:', error);
		return constructResponse(500, { message: 'Internal Server Error' });
	}
}

