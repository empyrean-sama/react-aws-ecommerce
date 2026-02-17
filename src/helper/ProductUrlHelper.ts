export function toProductSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'item';
}

export function getProductPath(collectionName: string, productName: string): string {
    return `/product/${toProductSlug(collectionName)}/${toProductSlug(productName)}`;
}
