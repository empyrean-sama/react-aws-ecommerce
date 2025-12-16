import EProductFieldType from "../../../enum/EProductFieldType"

export default interface IProductField {
    type: EProductFieldType // The type of the product field, cast into more specific interface for intellisense support
}