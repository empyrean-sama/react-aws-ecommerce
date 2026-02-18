import React, { useEffect } from "react";
import AuthService from "../../../service/AuthService";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import { Container, Typography, Box, Grid, Tab, Tabs, IconButton, CircularProgress } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import OrderCard from "./OrderCard";
import AddressPanel from "./AddressPanel";
import ProductService from "../../../service/ProductService";
import IOrderRecord from "../../../interface/order/IOrderRecord";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";
import { OrderStatus } from "../../../interface/order/OrderStatus";

function formatMoney(value: number): string {
    return `₹${(Number(value || 0) / 100).toFixed(2)}`;
}

function normalizeOrderStatus(status: string): OrderStatus {
    const normalized = status?.toLowerCase?.() ?? '';
    if (normalized === 'order placed' || normalized === 'processing' || normalized === 'shipped' || normalized === 'delivered' || normalized === 'cancelled') {
        return normalized;
    }
    return 'processing';
}

export default function Account() {

    // Global API
    const { getLoggedInDetails, setCart, showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const authService = AuthService.getInstance();
    const productService = ProductService.getInstance();
    const navigateTo = useNavigate();

    // State
    const [tabLocation, setTabLocation] = React.useState<"orders" | "addresses">("orders");
    const [orders, setOrders] = React.useState<IOrderRecord[]>([]);
    const [isOrdersLoading, setIsOrdersLoading] = React.useState<boolean>(true);

    // Effects
    useEffect(() => {
        // Redirect to login if not logged in
        (async () => {
            const userDetails = await authService.getCurrentUser();
            if(!userDetails) {
                navigateTo("/account/login", {replace: true});
            }
        })();
    },[getLoggedInDetails()]);

    useEffect(() => {
        (async () => {
            setIsOrdersLoading(true);
            try {
                const fetchedOrders = await productService.getMyOrders();
                setOrders(fetchedOrders);
            } catch {
                setOrders([]);
            } finally {
                setIsOrdersLoading(false);
            }
        })();
    }, []);

    async function handleReorder(order: IOrderRecord): Promise<void> {
        const reorderedProducts = (order.products || [])
            .map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: Number(item.quantity || 0),
            }))
            .filter((item) => item.productId && item.variantId && Number.isFinite(item.quantity) && item.quantity > 0);

        if (reorderedProducts.length === 0) {
            showMessage("Unable to reorder: no valid items found in this order.", ESnackbarMsgVariant.warning);
            return;
        }

        try {
            await setCart({ products: reorderedProducts });

            const cartAfterReorder = await authService.getCart();
            const actualQuantityByItemKey = new Map<string, number>(
                (cartAfterReorder.products || []).map((item) => [`${item.productId}::${item.variantId}`, item.quantity])
            );

            const requestedItemsNotFullyAdded = reorderedProducts.filter((item) => {
                const actualQuantity = actualQuantityByItemKey.get(`${item.productId}::${item.variantId}`) || 0;
                return actualQuantity < item.quantity;
            });

            if (requestedItemsNotFullyAdded.length > 0) {
                showMessage(
                    `${requestedItemsNotFullyAdded.length} item(s) could not be fully added to cart due to stock limits, order limits, or because the item is no longer available in the catalog.`,
                    ESnackbarMsgVariant.warning
                );
            } else {
                showMessage("Items added to cart from this order.", ESnackbarMsgVariant.success);
            }

            navigateTo("/cart");
        } catch (error: any) {
            showMessage(error?.message || "Failed to reorder items.", ESnackbarMsgVariant.error);
        }
    }

    return (
        <Container maxWidth="xl" sx={{ paddingX: { xs: 0, sm: 3 }, marginY: 4, display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: { xs: "center", sm: "space-between" } }}>
                <Typography variant="h1" component="h1">Hi {getLoggedInDetails()?.givenName} {getLoggedInDetails()?.familyName},</Typography>
                <IconButton onClick={() => navigateTo("/account/profile")}>
                    <EditIcon />
                </IconButton>
            </Box>
            
            <Tabs
                value={tabLocation}
                onChange={(e, newValue) => {
                    setTabLocation(newValue);
                }}
                variant="fullWidth"
                sx={{ display: {xl: "none"} }}
            >
                <Tab value="orders" label="Orders" />
                <Tab value="addresses" label="Addresses" />
            </Tabs>

            <Grid container spacing={2}>
                <Grid size={{xs: 12, xl: 7}}>
                    <Box sx={{display: { xs: tabLocation === "orders" ? "flex" : "none", xl: "flex" }, flexDirection: 'column', gap: 2}}>
                        {isOrdersLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : orders.length === 0 ? (
                            <Typography variant="h6" component="p" sx={{ mb: 3 }}>
                                No orders yet.
                            </Typography>
                        ) : (
                            orders.map((order) => (
                                <OrderCard
                                    key={`${order.userId}-${order.createdAt}-${order.orderId}`}
                                    status={normalizeOrderStatus(order.status)}
                                    itemData={(order.products ?? []).map((item) => ({
                                        name: `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`,
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
                                    orderId={order.orderId}
                                    orderDate={new Date(order.createdAt)}
                                    shippingAddress={{
                                        userLabel: order.shippingAddress?.userLabel ?? 'Address',
                                        phoneNumber: order.shippingAddress?.phoneNumber ?? order.customerPhone ?? '',
                                        specificAddress: order.shippingAddress?.specificAddress ?? '',
                                        street: order.shippingAddress?.street ?? '',
                                        area: order.shippingAddress?.area ?? '',
                                        postcode: order.shippingAddress?.postcode ?? '',
                                        city: order.shippingAddress?.city ?? '',
                                        state: order.shippingAddress?.state ?? '',
                                        country: order.shippingAddress?.country ?? '',
                                        latitude: order.shippingAddress?.latitude,
                                        longitude: order.shippingAddress?.longitude,
                                    }}
                                    paymentDetails={order.paymentDetails || order.paymentMode}
                                    paymentMode={order.paymentMode}
                                    phoneNumber={order.customerPhone || order.shippingAddress?.phoneNumber || ''}
                                    email={order.customerEmail || ''}
                                    onReorder={() => handleReorder(order)}
                                />
                            ))
                        )}
                    </Box>
                </Grid>
                <Grid size={{xs: 12, xl: 5}} sx={{display: 'flex', justifyContent: "center"}}>
                    <AddressPanel sx={{display: { xs: tabLocation === "addresses" ? "flex" : "none", xl: "flex" }}} />
                </Grid>
            </Grid>
        </Container>
    );
}