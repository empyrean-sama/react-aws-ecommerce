import IProductField from "./field/IProductField";

export default interface IProduct {
    collectionId: string,
    defaultVariantId: string,
    fields: IProductField[],
    imageUrls: string[],
}