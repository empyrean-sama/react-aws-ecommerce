import ICartEntryRecord from "./product/ICartEntryRecord";
import IProductRecord from "./product/IProductRecord";
import IProductVariantRecord from "./product/IProductVariantRecord";

export default interface IAppGlobalCartState {
    cartEntryRecord: ICartEntryRecord | null;
    productIdToProductRecordMap: Record<string, IProductRecord>;
    productIdToVariantsRecordMap: Record<string, IProductVariantRecord[]>;
}