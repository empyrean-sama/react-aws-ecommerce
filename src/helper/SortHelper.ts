export type SortOrder = "asc" | "desc";

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function getComparator<Key extends keyof any>(order: SortOrder, orderBy: Key): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
    if(order === "desc"){
        return (a, b) => descendingComparator(a, b, orderBy);
    } else {
        return (a, b) => -descendingComparator(a, b, orderBy);
    }
}

/**
 * Helper function to sort an array of objects by a specified key and order.
 * @param array the array to be sorted
 * @param sortOrder the order of sorting, either "asc" for ascending or "desc" for descending
 * @param orderBy the key of the object to sort by
 * @returns a new sorted array
 */
export default function sort<T>(array: T[], sortOrder: SortOrder, orderBy: keyof T): T[] {
    const comparator = getComparator(sortOrder, orderBy);
    const sortedArray = [...array].sort(comparator);
    return sortedArray;
}