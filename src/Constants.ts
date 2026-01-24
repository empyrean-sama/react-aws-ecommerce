export default class Constants {
    static readonly DRAWER_WIDTH_MOBILE: string = "80dvw";
    static readonly DRAWER_WIDTH_TABLET: string = "400px";

    static readonly IMAGE_UPLOAD_MAX_BYTES: number = 5_000_000;
    static readonly IMAGE_UPLOAD_ALLOWED_TYPES: string[] = ['image/jpeg','image/png','image/webp','image/avif'];
    static readonly LOCAL_STORAGE_CART_KEY: string = "ecommerce-app-cart";

    static readonly PROMOTION_BANNER_LIST_KEY: string = "promotion-banners-list";
}