export default interface IPresignUploadInput {
    fileName: string, 
    contentType: 'image/webp', // only webp allowed to optimize for storage and delivery costs, as well as performance on client side
    contentMd5: string, 
    contentLength: number,
    sanitizedFileName?: string, // optional field to hold the sanitized file name that will be used for storage, this is generated in the lambda after validating the input
}