export default interface IOrderProductRecord {
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    productName: string;
    variantName: string;
    imageUrl: string;
}
