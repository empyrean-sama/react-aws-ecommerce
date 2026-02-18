import IAddress from '../IAddress';
import IOrderProductRecord from './IOrderProductRecord';

export type EOrderPaymentMode = 'Pre Paid' | 'Cash on Delivery';
export type EOrderPaymentStatus = 'pending' | 'paid' | 'failed';

export default interface IOrderRecord {
    userId: string;
    createdAt: number;
    orderId: string;
    status: string;
    paymentStatus: EOrderPaymentStatus;
    paymentMode: EOrderPaymentMode;
    paymentDetails: string;

    subtotal: number;
    shippingFee: number;
    tax: number;
    total: number;
    currency: 'INR';

    products: IOrderProductRecord[];
    shippingAddress: IAddress;

    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
}
