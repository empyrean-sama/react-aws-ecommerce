import IProductField from "./IProductField";

export default interface ISectionField extends IProductField {
    sectionTitle: string; // The title of the section
    sectionDescription: string; // The description for the section
}