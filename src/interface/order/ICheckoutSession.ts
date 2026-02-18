import IAddress from '../IAddress';
import ICheckoutItemInput from './ICheckoutItemInput';

export type ECheckoutSource = 'cart' | 'single';

export interface ICheckoutCreateInput {
    source: ECheckoutSource;
    items: ICheckoutItemInput[];
    shippingAddress: IAddress;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
}

export interface ICheckoutCreateResult {
    orderId: string;
    createdAt: number;
    amount: number;
    currency: 'INR';
    razorpayOrderId: string;
    razorpayKeyId: string;
}

export interface ICheckoutConfirmInput {
    orderId: string;
    createdAt: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
