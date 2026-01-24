import AuthService from "./AuthService";
import OutputParser from "./OutputParser";

export default class UtilityService {
    private static _instance: UtilityService;
    public static getInstance(): UtilityService {
        if (!this._instance) {
            this._instance = new UtilityService();
        }
        return this._instance;
    }

    /**
     * Get a list from s3 using the specified key, empty if not found,
     * Will use authenticated fetch if the user is logged in, else unauthenticated fetch
     * ! Will fail silently and return empty list if any error occurs
     * @param memoryKey: key to retrieve list from
     */
    public async getList(memoryKey: string): Promise<Record<string, any>[]> {
        try {
            const url = new URL(OutputParser.ListEndPointURL);
            url.searchParams.set('key', memoryKey);

            const authService = AuthService.getInstance();
            const currentUser = await authService.getCurrentUser();

            const resp = currentUser
                ? await authService.authorizedFetch(url, { method: 'GET' })
                : await fetch(url, { method: 'GET' });

            if (!resp.ok) {
                return [];
            }

            const json = await resp.json().catch(() => undefined);
            return Array.isArray(json) ? (json as Record<string, any>[]) : [];
        }
        catch {
            return [];
        }
    }

    /**
     * Save a list to s3 using the specified key
     * Will use authenticated fetch if the user is logged in, else unauthenticated fetch
     * ! Will fail silently if any error occurs
     * @param memoryKey: key to save list to
     * @param list: list to save
     */
    public async saveList(memoryKey: string, list: Record<string, any>[]): Promise<{isSuccess: boolean, message?: string}> {
        try {
            const url = new URL(OutputParser.ListEndPointURL);
            url.searchParams.set('key', memoryKey);

            const authService = AuthService.getInstance();
            const currentUser = await authService.getCurrentUser();

            const resp = currentUser
                ? await authService.authorizedFetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(list ?? []),
                })
                : await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(list ?? []),
                });

            if (!resp.ok) {
                return { isSuccess: false, message: "Failed to save list." };
            }
        }
        catch {
            return { isSuccess: false, message: "An error occurred while saving the list." };
        }
        return { isSuccess: true };
    }
};