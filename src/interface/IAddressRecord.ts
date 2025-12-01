import IAddress from './IAddress';
import IBaseRecord from './IBaseRecord';

export default interface IAddressRecord extends IAddress, IBaseRecord {
    addressId: string;
}