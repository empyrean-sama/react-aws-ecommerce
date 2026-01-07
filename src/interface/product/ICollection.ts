export default interface ICollection {
    name: string,
    description: string,
    favourite: "true" | 'false'; // This type is constrained due to DynamoDB storage as string
    favouriteStrength: number,
}