import AuthService from "./AuthService";
import OutputParser from "./OutputParser";

import ICollection from "../interface/product/ICollection";
import ICollectionRecord from "../interface/product/ICollectionRecord";
import IProduct from "../interface/product/IProduct";
import IProductRecord from "../interface/product/IProductRecord";
import IReview from "../interface/product/IReview";
import IReviewRecord from "../interface/product/IReviewRecord";
import IProductSearchIndex from "../interface/product/IProductSearchIndex";
import IProductVariant from "../interface/product/IProductVariant";
import IProductVariantRecord from "../interface/product/IProductVariantRecord";
import { ICheckoutConfirmInput, ICheckoutCreateInput, ICheckoutCreateResult } from "../interface/order/ICheckoutSession";
import IOrderRecord from "../interface/order/IOrderRecord";

type IReviewWriteInput = Omit<IReview, 'userId' | 'orderReference' | 'reviewerName' | 'reviewerUsername'>;
type IReviewAverage = { productId: string; averageScore: number; reviewCount: number };

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
     * Get a collection by ID.
     * @param collectionId The ID of the collection to retrieve
     * @returns The collection record or null if not found
     */
    public async getCollection(collectionId: string): Promise<ICollectionRecord | null> {
        const url = new URL(OutputParser.CollectionsEndPointURL);
        url.searchParams.set('collectionId', collectionId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as ICollectionRecord) ?? null;
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
     * Get all products within a collection that contain a specific tag.
     * @param collectionId The collection to query
     * @param tag The tag to filter by (case-insensitive on the backend)
     */
    public async getProductsByCollectionIdAndTag(collectionId: string, tag: string): Promise<IProductRecord[] | null> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        url.searchParams.set('collectionId', collectionId);
        url.searchParams.set('tag', tag);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as IProductRecord[]) ?? [];
    }

    /**
     * List all unique tags across products in a given collection.
     * @param collectionId The collection to aggregate tags for
     */
    public async getUniqueTagsByCollectionId(collectionId: string): Promise<string[] | null> {
        const url = new URL(OutputParser.ProductTagsEndPointURL);
        url.searchParams.set('collectionId', collectionId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as string[]) ?? [];
    }

    /**
     * Get all featured products across the backend.
     * @returns An array of product records or null if request failed
     */
    public async getFeaturedProducts(): Promise<IProductRecord[] | null> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        url.searchParams.set('featured', 'true');
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as IProductRecord[]) ?? [];
    }

    /**
     * Get favourite products within a specific collection.
     * @param collectionId The collection to query
     * @returns An array of product records or null if request failed
     */
    public async getFavouriteProductsByCollectionId(collectionId: string): Promise<IProductRecord[] | null> {
        const url = new URL(OutputParser.ProductsEndPointURL);
        url.searchParams.set('collectionId', collectionId);
        url.searchParams.set('favourite', 'true');
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

    // Images

    /**
     * Get a presigned URL for uploading an image.
     * @param fileName The name of the file
     * @param contentType The MIME type of the file
     * @param contentMd5 The MD5 hash of the file content (base64 encoded)
     * @param contentLength The size of the file in bytes
     * @returns The presigned URL and other details
     */
    public async getPresignedUploadUrl(fileName: string, contentType: string, contentMd5: string, contentLength: number): Promise<{ uploadUrl: string, bucket: string, key: string, requiredHeaders: Record<string, string> }> {
        const url = OutputParser.UploadToMemoryEndPointURL;
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, contentType, contentMd5, contentLength })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to get presigned URL');
        }
        return json;
    }

    /**
     * Upload a file to S3 using a presigned URL.
     * @param uploadUrl The presigned URL
     * @param file The file to upload
     * @param requiredHeaders Headers required by the presigned URL
     */
    public async uploadFileToS3(uploadUrl: string, file: File, requiredHeaders: Record<string, string>): Promise<void> {
        const headers: Record<string, string> = { ...requiredHeaders };
        // Ensure Content-Type is set if not in requiredHeaders (though it should be)
        if (!headers['Content-Type']) {
            headers['Content-Type'] = file.type;
        }

        const resp = await fetch(uploadUrl, {
            method: 'PUT',
            headers: headers,
            body: file
        });

        if (!resp.ok) {
            throw new Error('Failed to upload file to S3');
        }
    }

    /**
     * Delete an image from S3.
     * @param key The key of the image to delete
     */
    public async deleteImage(key: string): Promise<void> {
        const url = new URL(OutputParser.ImageEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to delete image');
        }
    }

    // Reviews
    public async getReviewsByProductId(productId: string): Promise<IReviewRecord[] | null> {
        const url = new URL(OutputParser.ReviewsEndPointURL);
        url.searchParams.set('productId', productId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined);
        if (!resp.ok) {
            return null;
        }
        return (json as IReviewRecord[]) ?? [];
    }

    public async getReviewSubmissionEligibility(productId: string): Promise<{ canSubmit: boolean; reason?: string }> {
        const url = new URL(OutputParser.ReviewEligibilityEndPointURL);
        url.searchParams.set('productId', productId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to get review submission eligibility');
        }
        return {
            canSubmit: Boolean(json?.canSubmit),
            ...(typeof json?.reason === 'string' ? { reason: json.reason } : {}),
        };
    }

    public async getAverageReviewScoreByProductId(productId: string): Promise<IReviewAverage | null> {
        const url = new URL(OutputParser.ReviewAverageEndPointURL);
        url.searchParams.set('productId', productId);
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            return null;
        }
        if (!json || typeof json.productId !== 'string' || typeof json.averageScore !== 'number') {
            return null;
        }
        return {
            productId: json.productId,
            averageScore: json.averageScore,
            reviewCount: typeof json.reviewCount === 'number' ? json.reviewCount : 0,
        };
    }

    public async getAverageReviewScoresByProductIds(productIds: string[]): Promise<Record<string, IReviewAverage>> {
        const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));
        if (uniqueProductIds.length === 0) {
            return {};
        }

        const url = new URL(OutputParser.ReviewAverageEndPointURL);
        url.searchParams.set('productIds', uniqueProductIds.join(','));
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok || !Array.isArray(json)) {
            return {};
        }

        const map: Record<string, IReviewAverage> = {};
        for (const item of json) {
            if (!item || typeof item.productId !== 'string' || typeof item.averageScore !== 'number') {
                continue;
            }
            map[item.productId] = {
                productId: item.productId,
                averageScore: item.averageScore,
                reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 0,
            };
        }

        return map;
    }

    // Product Search Index
    public async regenerateProductSearchIndex(): Promise<{ message: string; objectKey: string; totalProducts: number; generatedAt: number }> {
        const url = new URL(OutputParser.ProductSearchIndexEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'POST' });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to regenerate product search index');
        }

        return {
            message: typeof json?.message === 'string' ? json.message : 'Search index regenerated successfully',
            objectKey: typeof json?.objectKey === 'string' ? json.objectKey : '',
            totalProducts: typeof json?.totalProducts === 'number' ? json.totalProducts : 0,
            generatedAt: typeof json?.generatedAt === 'number' ? json.generatedAt : Date.now(),
        };
    }

    public async getPublicProductSearchIndex(): Promise<IProductSearchIndex | null> {
        const resp = await fetch(OutputParser.ProductSearchIndexPublicURL, {
            method: 'GET',
            cache: 'no-store',
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok || !json || typeof json !== 'object') {
            return null;
        }
        if (typeof json.generatedAt !== 'number' || typeof json.totalProducts !== 'number' || typeof json.productsByName !== 'object' || json.productsByName === null) {
            return null;
        }
        return json as IProductSearchIndex;
    }

    // Checkout
    public async createCheckoutSession(input: ICheckoutCreateInput & { guestUserId?: string }, isAuthenticated: boolean): Promise<ICheckoutCreateResult & { guestUserId?: string }> {
        const url = new URL(isAuthenticated ? OutputParser.CheckoutAuthEndPointURL : OutputParser.CheckoutEndPointURL);

        const requestInit: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        };

        const resp = isAuthenticated
            ? await AuthService.getInstance().authorizedFetch(url, requestInit)
            : await fetch(url, requestInit);

        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to create checkout session');
        }

        return {
            orderId: String(json?.orderId || ''),
            createdAt: Number(json?.createdAt || 0),
            amount: Number(json?.amount || 0),
            currency: 'INR',
            razorpayOrderId: String(json?.razorpayOrderId || ''),
            razorpayKeyId: String(json?.razorpayKeyId || ''),
            ...(typeof json?.guestUserId === 'string' ? { guestUserId: json.guestUserId } : {}),
        };
    }

    public async confirmCheckoutPayment(input: ICheckoutConfirmInput & { guestUserId?: string }, isAuthenticated: boolean): Promise<void> {
        const url = new URL(isAuthenticated ? OutputParser.CheckoutAuthEndPointURL : OutputParser.CheckoutEndPointURL);

        const requestInit: RequestInit = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        };

        const resp = isAuthenticated
            ? await AuthService.getInstance().authorizedFetch(url, requestInit)
            : await fetch(url, requestInit);

        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to confirm payment');
        }
    }

    public async getMyOrders(): Promise<IOrderRecord[]> {
        const url = new URL(OutputParser.CheckoutAuthEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'GET' });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to fetch orders');
        }
        return Array.isArray(json) ? (json as IOrderRecord[]) : [];
    }

    public async createReview(review: IReviewWriteInput): Promise<IReviewRecord> {
        const url = new URL(OutputParser.ReviewsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to create review');
        }
        return json.review as IReviewRecord;
    }

    public async updateReview(reviewId: string, review: IReviewWriteInput): Promise<IReviewRecord> {
        const url = new URL(OutputParser.ReviewsEndPointURL);
        const resp = await AuthService.getInstance().authorizedFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewId, review })
        });
        const json = await resp.json().catch(() => undefined) as any;
        if (!resp.ok) {
            throw new Error(json?.message || 'Failed to update review');
        }
        return json.review as IReviewRecord;
    }

    public async deleteReview(reviewId: string): Promise<void> {
        const url = new URL(OutputParser.ReviewsEndPointURL);
        url.searchParams.set('reviewId', reviewId);
        const resp = await AuthService.getInstance().authorizedFetch(url, { method: 'DELETE' });
        if (!resp.ok) {
            const json = await resp.json().catch(() => undefined) as any;
            throw new Error(json?.message || 'Failed to delete review');
        }
    }
}
