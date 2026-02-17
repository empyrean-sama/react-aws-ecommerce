export default interface IReview {
    userId: string;
    orderReference: string;
    productId: string;
    title: string;
    text: string;
    starRating: number;
    reviewerName: string;
    reviewerUsername: string;
}