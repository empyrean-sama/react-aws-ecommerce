import IProductField from "./IProductField";

export default interface ITableField extends IProductField {
    tableName: string; // The name of the table.
    columns: string[]; // The column headers for the table.
    rows: string[][];  // The rows of data in the table.
}
