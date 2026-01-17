export default interface ICartEntry {
    products: ICartEntryItem[],
}

export interface ICartEntryItem {
    productId: string,
    variantId: string,
    quantity: number,
}