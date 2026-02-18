export default class Constants {
    static readonly DRAWER_WIDTH_MOBILE: string = "80dvw";
    static readonly DRAWER_WIDTH_TABLET: string = "400px";

    static readonly IMAGE_UPLOAD_MAX_BYTES: number = 5_000_000;
    static readonly IMAGE_UPLOAD_ALLOWED_TYPES: string[] = ['image/jpeg','image/png','image/webp','image/avif'];
    static readonly LOCAL_STORAGE_CART_KEY: string = "ecommerce-app-cart";
    static readonly LOCAL_STORAGE_GUEST_CHECKOUT_USER_KEY: string = "ecommerce-app-guest-checkout-user";

    static readonly PROMOTION_BANNER_LIST_KEY: string = "promotion-banners-list";

    static readonly SUPPORT_CONTACT_EMAIL: string = "support@srividhyafoods.com";
    static readonly SUPPORT_CONTACT_PHONE: string = "+91-00000-00000";
}