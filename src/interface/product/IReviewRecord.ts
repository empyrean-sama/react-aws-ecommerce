import IReview from './IReview';

export default interface IReviewRecord extends IReview {
    reviewId: string;
    createdAt: number;
    updatedAt: number;
}
