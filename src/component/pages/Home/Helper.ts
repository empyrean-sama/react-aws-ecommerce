export function getStockStatus(stockCount: number): { statusText: string, statusColor: 'success' | 'warning' | 'error' } {
    if(stockCount > 10) {
        return { statusText: 'In Stock', statusColor: 'success' };
    }
    else if(stockCount > 0) {
        return { statusText: `Only ${stockCount} left in stock`, statusColor: 'warning' };
    }
    else {
        return { statusText: 'Out of Stock', statusColor: 'error' };
    }
}