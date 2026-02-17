export interface IProductSearchIndexEntry {
    productId: string;
    imageUrl: string;
}

export default interface IProductSearchIndex {
    generatedAt: number;
    totalProducts: number;
    productsByName: Record<string, IProductSearchIndexEntry[]>;
}
