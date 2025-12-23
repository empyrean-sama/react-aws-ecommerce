export default interface IProductVariant {
    name: string,
    price: number, //always in the smallest currency unit of the republic of india (inr) that is paisa
    stock: number,
    maximumInOrder: number | undefined, // don't allow more than this number to be ordered in a single order
    relatedProductIds: string[], // might be empty, expect the administrator to fill this with related variant ids

    // Note: System enforces a maximum of 24 variants per productId
    productId: string, // The id this variant belongs to
    collectionId: string, // The collection id this variant belongs to
}