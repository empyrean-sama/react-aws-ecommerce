export default interface IPresignUploadOutput {
    uploadUrl: string,
    bucket: string,
    key: string,
    expiresIn: number,
    requiredHeaders: {
        'Content-Type': string,
        'Content-MD5': string
    },
    maxBytes: number
}