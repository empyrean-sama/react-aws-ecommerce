import IProductField from "./field/IProductField";

export default interface IProduct {
    collectionId?: string, // The way the backend interface is designed, this can be optional on creation and become invalid while in use. hence putting it as optional in the interface
    defaultVariantId: string,
    fields: IProductField[],
    imageUrls: string[],
}