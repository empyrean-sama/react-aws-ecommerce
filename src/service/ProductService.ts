import AuthService from "./AuthService";
import OutputParser from "./OutputParser";

import ICollection from "../interface/product/ICollection";
import ICollectionRecord from "../interface/product/ICollectionRecord";
import IProduct from "../interface/product/IProduct";
import IProductRecord from "../interface/product/IProductRecord";
import IProductVariant from "../interface/product/IProductVariant";
import IProductVariantRecord from "../interface/product/IProductVariantRecord";

export default class ProductService {
    private static _instance: ProductService | null = null;
    private constructor() {}

    public static getInstance(): ProductService {
        if (this._instance === null) {
            this._instance = new ProductService();
        }
        return this._instance;
    }

    // Collections
    
    /**
     * List all collections of products from the backend service.
     * @returns all the collections or null if the request failed
     */
    public async listCollections(): Promise<ICollectionRecord[] | null> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as ICollectionRecord[]) ?? [];
    }

    /**
     * List all favourite collections of products from the backend service.
     * @returns all the favourite collections or null if the request failed
     */
    public async getFavouriteCollections(): Promise<ICollectionRecord[] | null> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        url.searchParams.set('favourite', 'true');
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as ICollectionRecord[]) ?? [];
    }

    /**
     * Set the favourite status of a collection.
     * @param collectionId The ID of the collection to update
     * @param favourite The new favourite status
     */
    public async setCollectionFavourite(collectionId: string, favourite: boolean): Promise<void> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId, favourite })
        });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to update collection favourite status');
        }
    }

    /**
     * Create a new collection of products in the backend service.
     * @param collection The collection data to create
     * @returns The created collection record
     */
    public async createCollection(collection: ICollection): Promise<ICollectionRecord> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to create collection');
        }
        return json.collection as ICollectionRecord;
    }

    /**
     * Update an existing collection of products in the backend service.
     * @param collectionId The ID of the collection to update
     * @param collection The updated collection data
     * @returns The updated collection record
     */
    public async updateCollection(collectionId: string, collection: ICollection): Promise<ICollectionRecord> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId, collection })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to update collection');
        }
        return json.collection as ICollectionRecord;
    }

    /**
     * Delete a collection of products from the backend service.
     * @param collectionId The ID of the collection to delete
     * ! Also deletes all products and variants within the collection
     */
    public async deleteCollection(collectionId: string): Promise<void> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        url.searchParams.set('collectionId', collectionId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'DELETE' });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to delete collection');
        }
    }

    /**
     * Get a product by its ID.
     * @param productId The ID of the product to retrieve
     * @returns The product record or null if not found
     */
    public async getProductById(productId: string): Promise<IProductRecord | null> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        url.searchParams.set('productId', productId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return json as IProductRecord;
    }

    /**
     * Get all products with the same collection ID.
     * @param collectionId The ID of the collection to retrieve products for
     * @returns An array of product records or null if not found
     */
    public async getProductsByCollectionId(collectionId: string): Promise<IProductRecord[] | null> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        url.searchParams.set('collectionId', collectionId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as IProductRecord[]) ?? [];
    }

    /**
     * Create a new product in the backend service.
     * @param product: The product data to create
     * @returns The created product record
     */
    public async createProduct(product: IProduct): Promise<IProductRecord> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to create product');
        }
        return (json.item ?? json.product) as IProductRecord;
    }

    /**
     * Update an existing product in the backend service.
     * @param productId The ID of the product to update
     * @param product The updated product data
     * @returns The updated product record
     */
    public async updateProduct(productId: string, product: IProduct): Promise<IProductRecord> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, product })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to update product');
        }
        return (json.item ?? json.product) as IProductRecord;
    }

    /**
     * Update the default variant of a product.
     * @param productId The ID of the product to update
     * @param defaultVariantId The ID of the default variant to set
     */
    public async updateDefaultVariant(productId: string, defaultVariantId: string): Promise<void> {
        const url = new URL(OutputParser.ProductDefaultVariantEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, defaultVariantId })
        });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to update default variant');
        }
    }

    /**
     * Delete a product from the backend service.
     * @param productId The ID of the product to delete
     */
    public async deleteProduct(productId: string): Promise<void> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        url.searchParams.set('productId', productId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'DELETE' });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to delete product');
        }
    }

    // Variants

    /**
     * Get a product variant by its ID.
     * @param variantId: The ID of the variant to retrieve
     * @returns The product variant record or null if not found
     */
    public async getVariantById(variantId: string): Promise<IProductVariantRecord | null> {
        const url = new URL(OutputParser.VariantsEndPointURL);
        url.searchParams.set('variantId', variantId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return json as IProductVariantRecord;
    }

    /**
     * Get all variants for a specific product by product ID.
     * @param productId: The ID of the product to retrieve variants for
     * @returns The list of product variant records or null if not found
     */
    public async getVariantsByProductId(productId: string): Promise<IProductVariantRecord[] | null> {
        const url = new URL(OutputParser.VariantsEndPointURL);
        url.searchParams.set('productId', productId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as IProductVariantRecord[]) ?? [];
    }

    /**
     * Create a new product variant in the backend service.
     * @param variant The variant to create
     * @returns The created product variant record
     */
    public async createVariant(variant: IProductVariant): Promise<IProductVariantRecord> {
        const url = new URL(OutputParser.VariantsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to create variant');
        }
        return json.variant as IProductVariantRecord;
    }

    /**
     * Update an existing product variant in the backend service.
     * @param variantId The ID of the variant to update
     * @param variant The updated variant data
     * @returns The updated product variant record
     */
    public async updateVariant(variantId: string, variant: IProductVariant): Promise<IProductVariantRecord> {
        const url = new URL(OutputParser.VariantsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantId, variant })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to update variant');
        }
        return json.variant as IProductVariantRecord;
    }

    /**
     * Delete a product variant from the backend service.
     * @param variantId The ID of the variant to delete
     */
    public async deleteVariant(variantId: string): Promise<void> {
        const url = new URL(OutputParser.VariantsEndPointURL);
        url.searchParams.set('variantId', variantId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'DELETE' });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to delete variant');
        }
    }
}
