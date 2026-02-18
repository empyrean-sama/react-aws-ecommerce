export const ORDER_STATUS_OPTIONS = [
    "order placed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
] as const;

export type OrderStatus = typeof ORDER_STATUS_OPTIONS[number];
