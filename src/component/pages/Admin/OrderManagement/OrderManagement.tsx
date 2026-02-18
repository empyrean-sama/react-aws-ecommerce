import React from "react";
import Fuse from "fuse.js";
import ProductService from "../../../../service/ProductService";
import IOrderRecord from "../../../../interface/order/IOrderRecord";
import { ORDER_STATUS_OPTIONS } from "../../../../interface/order/OrderStatus";
import { appGlobalStateContext } from "../../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../../enum/ESnackbarMsgVariant";
import { useNavigate } from "react-router";

import {
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";

type PaymentFilter = "all" | "paid" | "pending" | "failed";

function formatCurrency(valueInMinorUnit: number, currency: string): string {
    if (!Number.isFinite(valueInMinorUnit)) {
        return "N/A";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(valueInMinorUnit / 100);
}

function formatDate(timestamp: number): string {
    if (!Number.isFinite(timestamp)) {
        return "N/A";
    }
    return new Date(timestamp).toLocaleString();
}

function getPaymentStatusColor(status: string): "success" | "warning" | "error" | "default" {
    const normalized = (status || "").toLowerCase();
    if (normalized === "paid") return "success";
    if (normalized === "pending") return "warning";
    if (normalized === "failed") return "error";
    return "default";
}

export default function OrderManagement() {
    const navigateTo = useNavigate();
    const productService = ProductService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [orders, setOrders] = React.useState<IOrderRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all");
    const [searchText, setSearchText] = React.useState<string>("");
    const [orderStatusEdits, setOrderStatusEdits] = React.useState<Record<string, string>>({});
    const [savingOrderKeyMap, setSavingOrderKeyMap] = React.useState<Record<string, boolean>>({});
    const [deletingOrderKeyMap, setDeletingOrderKeyMap] = React.useState<Record<string, boolean>>({});

    const sortedOrders = React.useMemo(() => {
        return [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [orders]);

    const fuse = React.useMemo(() => {
        return new Fuse(sortedOrders, {
            threshold: 0.35,
            ignoreLocation: true,
            keys: [
                "orderId",
                "customerName",
                "customerEmail",
                "customerPhone",
                "shippingAddress.userLabel",
                "shippingAddress.phoneNumber",
                "shippingAddress.specificAddress",
                "shippingAddress.street",
                "shippingAddress.area",
                "shippingAddress.city",
                "shippingAddress.state",
                "shippingAddress.country",
                "shippingAddress.postcode",
            ],
        });
    }, [sortedOrders]);

    const searchedOrders = React.useMemo(() => {
        const query = searchText.trim();
        if (!query) {
            return sortedOrders;
        }
        return fuse.search(query).map((result) => result.item);
    }, [searchText, sortedOrders, fuse]);

    const filteredOrders = React.useMemo(() => {
        if (paymentFilter === "all") {
            return searchedOrders;
        }
        return searchedOrders.filter((order) => (order.paymentStatus || "").toLowerCase() === paymentFilter);
    }, [searchedOrders, paymentFilter]);

    const statusCounts = React.useMemo(() => {
        return {
            all: searchedOrders.length,
            paid: searchedOrders.filter((order) => (order.paymentStatus || "").toLowerCase() === "paid").length,
            pending: searchedOrders.filter((order) => (order.paymentStatus || "").toLowerCase() === "pending").length,
            failed: searchedOrders.filter((order) => (order.paymentStatus || "").toLowerCase() === "failed").length,
        };
    }, [searchedOrders]);

    async function refreshOrders() {
        try {
            setIsLoading(true);
            const fetchedOrders = await productService.getAdminOrders();
            setOrders(fetchedOrders || []);
            setOrderStatusEdits({});
        } catch (error: any) {
            showMessage(error?.message || "Failed to load orders", ESnackbarMsgVariant.error);
        } finally {
            setIsLoading(false);
        }
    }

    function getOrderKey(order: IOrderRecord): string {
        return `${order.userId}::${order.createdAt}`;
    }

    function navigateToOrderDetails(order: IOrderRecord): void {
        navigateTo(`/admin/orders/details?userId=${encodeURIComponent(order.userId)}&createdAt=${encodeURIComponent(String(order.createdAt))}`);
    }

    async function handleSaveOrderStatus(order: IOrderRecord): Promise<void> {
        const orderKey = getOrderKey(order);
        const nextStatus = (orderStatusEdits[orderKey] || order.status || "").trim();
        if (!nextStatus || nextStatus === order.status) {
            return;
        }

        try {
            setSavingOrderKeyMap((prev) => ({ ...prev, [orderKey]: true }));
            await productService.updateOrderStatusAsAdmin({
                userId: order.userId,
                createdAt: order.createdAt,
                status: nextStatus,
            });
            showMessage("Order status updated", ESnackbarMsgVariant.success);
            await refreshOrders();
        } catch (error: any) {
            showMessage(error?.message || "Failed to update order status", ESnackbarMsgVariant.error);
        } finally {
            setSavingOrderKeyMap((prev) => ({ ...prev, [orderKey]: false }));
        }
    }

    async function handleDeleteOrder(order: IOrderRecord): Promise<void> {
        const confirmed = window.confirm(`Delete order ${order.orderId}? This cannot be undone.`);
        if (!confirmed) {
            return;
        }

        const orderKey = getOrderKey(order);
        try {
            setDeletingOrderKeyMap((prev) => ({ ...prev, [orderKey]: true }));
            await productService.deleteOrderAsAdmin({
                userId: order.userId,
                createdAt: order.createdAt,
            });
            showMessage("Order deleted", ESnackbarMsgVariant.success);
            await refreshOrders();
        } catch (error: any) {
            showMessage(error?.message || "Failed to delete order", ESnackbarMsgVariant.error);
        } finally {
            setDeletingOrderKeyMap((prev) => ({ ...prev, [orderKey]: false }));
        }
    }

    React.useEffect(() => {
        refreshOrders();
    }, []);

    if (isLoading) {
        return (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography variant="h4" component="h2">Order Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Review placed orders, payment status, and shipping details.
                    </Typography>
                </Box>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshOrders}>
                    Refresh
                </Button>
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label={`All (${statusCounts.all})`}
                        clickable
                        color={paymentFilter === "all" ? "primary" : "default"}
                        variant={paymentFilter === "all" ? "filled" : "outlined"}
                        onClick={() => setPaymentFilter("all")}
                    />
                    <Chip
                        label={`Paid (${statusCounts.paid})`}
                        clickable
                        color={paymentFilter === "paid" ? "primary" : "default"}
                        variant={paymentFilter === "paid" ? "filled" : "outlined"}
                        onClick={() => setPaymentFilter("paid")}
                    />
                    <Chip
                        label={`Pending (${statusCounts.pending})`}
                        clickable
                        color={paymentFilter === "pending" ? "primary" : "default"}
                        variant={paymentFilter === "pending" ? "filled" : "outlined"}
                        onClick={() => setPaymentFilter("pending")}
                    />
                    <Chip
                        label={`Failed (${statusCounts.failed})`}
                        clickable
                        color={paymentFilter === "failed" ? "primary" : "default"}
                        variant={paymentFilter === "failed" ? "filled" : "outlined"}
                        onClick={() => setPaymentFilter("failed")}
                    />
                </Stack>

                <TextField
                    size="small"
                    placeholder="Filter by order ID, customer, or shipping address"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    sx={{ width: 560 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Stack>

            <Paper>
                <TableContainer>
                    <Table size="small" aria-label="admin orders table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order ID</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Payment</TableCell>
                                <TableCell align="right">Items</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Shipping</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9}>
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                            {orders.length === 0
                                                ? "No orders found."
                                                : searchText.trim().length > 0
                                                    ? "No orders match this search."
                                                    : "No orders match this payment status."}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <TableRow
                                        key={`${order.userId}-${order.createdAt}`}
                                        hover
                                        onClick={() => navigateToOrderDetails(order)}
                                        sx={{ cursor: "pointer" }}
                                    >
                                        <TableCell sx={{ maxWidth: 220, wordBreak: "break-word" }}>
                                            <Typography variant="body2">{order.orderId}</Typography>
                                        </TableCell>
                                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                                        <TableCell onClick={(event) => event.stopPropagation()}>
                                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                                <Select
                                                    value={orderStatusEdits[getOrderKey(order)] ?? order.status ?? ""}
                                                    onChange={(event) => {
                                                        const orderKey = getOrderKey(order);
                                                        setOrderStatusEdits((prev) => ({
                                                            ...prev,
                                                            [orderKey]: String(event.target.value),
                                                        }));
                                                    }}
                                                >
                                                    {Array.from(new Set([...(order.status ? [order.status] : []), ...ORDER_STATUS_OPTIONS])).map((statusOption) => (
                                                        <MenuItem key={statusOption} value={statusOption}>{statusOption}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={order.paymentStatus || "N/A"}
                                                size="small"
                                                color={getPaymentStatusColor(order.paymentStatus)}
                                            />
                                        </TableCell>
                                        <TableCell align="right">{order.products?.length || 0}</TableCell>
                                        <TableCell align="right">{formatCurrency(order.total, order.currency || "INR")}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{order.customerName || "N/A"}</Typography>
                                            <Typography variant="caption" color="text.secondary">{order.customerEmail || order.customerPhone || "N/A"}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 260 }}>
                                            <Typography variant="body2" sx={{ whiteSpace: "normal" }}>
                                                {order.shippingAddress?.specificAddress || ""}
                                                {order.shippingAddress?.street ? `, ${order.shippingAddress.street}` : ""}
                                                {order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ""}
                                                {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
                                                {order.shippingAddress?.postcode ? ` - ${order.shippingAddress.postcode}` : ""}
                                            </Typography>
                                        </TableCell>
                                        <TableCell onClick={(event) => event.stopPropagation()}>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleSaveOrderStatus(order)}
                                                    disabled={savingOrderKeyMap[getOrderKey(order)] === true || deletingOrderKeyMap[getOrderKey(order)] === true || ((orderStatusEdits[getOrderKey(order)] ?? order.status ?? "") === (order.status ?? ""))}
                                                >
                                                    {savingOrderKeyMap[getOrderKey(order)] === true ? "Saving..." : "Save"}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => handleDeleteOrder(order)}
                                                    disabled={deletingOrderKeyMap[getOrderKey(order)] === true || savingOrderKeyMap[getOrderKey(order)] === true}
                                                >
                                                    {deletingOrderKeyMap[getOrderKey(order)] === true ? "Deleting..." : "Delete"}
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
