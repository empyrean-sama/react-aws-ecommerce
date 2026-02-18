import React, { Suspense } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ProductService from "../../../../service/ProductService";
import IOrderRecord from "../../../../interface/order/IOrderRecord";
import IAddress from "../../../../interface/IAddress";
import { appGlobalStateContext } from "../../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../../enum/ESnackbarMsgVariant";
import { OrderStatus } from "../../../../interface/order/OrderStatus";

const LazyOrderCard = React.lazy(() => import("../../User/OrderCard"));

function formatMoney(value: number): string {
    return `₹${(Number(value || 0) / 100).toFixed(2)}`;
}

function normalizeOrderStatus(status: string): OrderStatus {
    const normalized = status?.toLowerCase?.() ?? "";
    if (normalized === "order placed" || normalized === "processing" || normalized === "shipped" || normalized === "delivered" || normalized === "cancelled") {
        return normalized;
    }
    return "processing";
}

function toOrderCardAddress(address: IOrderRecord["shippingAddress"], customerPhone?: string): IAddress {
    return {
        userLabel: address?.userLabel ?? "Address",
        phoneNumber: address?.phoneNumber ?? customerPhone ?? "",
        specificAddress: address?.specificAddress ?? "",
        street: address?.street ?? "",
        area: address?.area ?? "",
        postcode: address?.postcode ?? "",
        city: address?.city ?? "",
        state: address?.state ?? "",
        country: address?.country ?? "",
        latitude: address?.latitude,
        longitude: address?.longitude,
    };
}

export default function OrderDetails() {
    const navigateTo = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("userId") || "";
    const createdAt = searchParams.get("createdAt") || "";
    const productService = ProductService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [order, setOrder] = React.useState<IOrderRecord | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        (async () => {
            if (!userId || !createdAt || !Number.isFinite(Number(createdAt))) {
                setOrder(null);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const orders = await productService.getAdminOrders();
                const matchedOrder = (orders || []).find((entry) => entry.userId === userId && String(entry.createdAt) === String(createdAt)) || null;
                setOrder(matchedOrder);
            } catch (error: any) {
                showMessage(error?.message || "Failed to load order details", ESnackbarMsgVariant.error);
                setOrder(null);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [userId, createdAt]);

    if (isLoading) {
        return (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!order) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h5">Order not found</Typography>
                <Button variant="outlined" onClick={() => navigateTo("/admin/orders")}>Back to Orders</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h4" component="h2">Order Details</Typography>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigateTo("/admin/orders")}>Back to Orders</Button>
            </Box>

            <Suspense fallback={<Box sx={{ width: "100%", display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
                <LazyOrderCard
                    orderId={order.orderId}
                    orderDate={new Date(order.createdAt)}
                    shippingAddress={toOrderCardAddress(order.shippingAddress, order.customerPhone)}
                    paymentMode={order.paymentMode}
                    paymentDetails={order.paymentDetails || order.paymentMode}
                    itemData={(order.products ?? []).map((item) => ({
                        name: `${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`,
                        cost: formatMoney(item.unitPrice),
                        quantity: String(item.quantity),
                        totalCost: formatMoney(item.lineTotal),
                        imageUrl: item.imageUrl,
                    }))}
                    orderSubtotal={formatMoney(order.subtotal)}
                    extraFees={{
                        Shipping: formatMoney(order.shippingFee),
                        Tax: formatMoney(order.tax),
                    }}
                    orderTotal={formatMoney(order.total)}
                    status={normalizeOrderStatus(order.status)}
                    phoneNumber={order.customerPhone || order.shippingAddress?.phoneNumber || ""}
                    email={order.customerEmail || ""}
                    alwaysExpanded
                    showActions={false}
                />
            </Suspense>
        </Box>
    );
}
