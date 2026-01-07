import IProductField from "./field/IProductField";

export default interface IProduct {
    name: string,
    description?: string,
    collectionId?: string, // The way the backend interface is designed, this can be optional on creation and become invalid while in use. hence putting it as optional in the interface
    defaultVariantId?: string, // Variants are created after product creation, so this is optional (but there is no use for an item with no variants)
    featured: "true" | "false", // Stored as string for DynamoDB GSI compatibility
    favourite: "true" | "false", // Stored as string for DynamoDB GSI compatibility
    fields: IProductField[], // These are the custom fields defined for the product
    imageUrls: string[], // Images associated with the product
}