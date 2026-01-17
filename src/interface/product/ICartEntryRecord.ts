import ICartEntry from "./ICartEntry";

export default interface ICartEntryRecord extends ICartEntry {
    userId: string;
}