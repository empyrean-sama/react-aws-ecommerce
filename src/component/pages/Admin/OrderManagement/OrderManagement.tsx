import React from "react";
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
    FormControl,
    IconButton,
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
    Tooltip,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const ORDERS_PAGE_SIZE = 25;

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

export default function OrderManagement() {
    const navigateTo = useNavigate();
    const productService = ProductService.getInstance();
    const { showMessage, setIsLoading: setGlobalLoading } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [orders, setOrders] = React.useState<IOrderRecord[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const [nextToken, setNextToken] = React.useState<string | null>(null);
    const [pageStartTokens, setPageStartTokens] = React.useState<Record<number, string | null>>({ 1: null });
    const [savingOrderKeyMap, setSavingOrderKeyMap] = React.useState<Record<string, boolean>>({});
    const [deletingOrderKeyMap, setDeletingOrderKeyMap] = React.useState<Record<string, boolean>>({});

    const sortedOrders = React.useMemo(() => {
        return [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [orders]);

    async function loadOrdersPage(page: number, startToken: string | null): Promise<void> {
        try {
            setIsLoading(true);
            setGlobalLoading(true);
            const pagedOrders = await productService.getAdminOrdersPage({
                limit: ORDERS_PAGE_SIZE,
                nextToken: startToken,
            });
            setOrders(pagedOrders.items || []);
            setNextToken(pagedOrders.nextToken);
            setCurrentPage(page);
            setPageStartTokens((prev) => ({
                ...prev,
                [page]: startToken,
            }));
        } catch (error: any) {
            showMessage(error?.message || "Failed to load orders", ESnackbarMsgVariant.error);
        } finally {
            setIsLoading(false);
            setGlobalLoading(false);
        }
    }

    async function refreshOrders() {
        setPageStartTokens({ 1: null });
        await loadOrdersPage(1, null);
    }

    async function reloadCurrentPage(): Promise<void> {
        const currentPageStartToken = pageStartTokens[currentPage] ?? null;
        await loadOrdersPage(currentPage, currentPageStartToken);
    }

    async function handleNextPage(): Promise<void> {
        if (!nextToken || isLoading) {
            return;
        }
        await loadOrdersPage(currentPage + 1, nextToken);
    }

    async function handlePreviousPage(): Promise<void> {
        if (currentPage <= 1 || isLoading) {
            return;
        }
        const previousPage = currentPage - 1;
        const previousStartToken = pageStartTokens[previousPage] ?? null;
        await loadOrdersPage(previousPage, previousStartToken);
    }

    function getOrderKey(order: IOrderRecord): string {
        return `${order.userId}::${order.createdAt}`;
    }

    function navigateToOrderDetails(order: IOrderRecord): void {
        navigateTo(`/admin/orders/details?userId=${encodeURIComponent(order.userId)}&createdAt=${encodeURIComponent(String(order.createdAt))}`);
    }

    async function handleOrderStatusChange(order: IOrderRecord, nextStatus: string): Promise<void> {
        const orderKey = getOrderKey(order);
        const normalizedStatus = (nextStatus || "").trim();
        if (!normalizedStatus || normalizedStatus === order.status) {
            return;
        }

        try {
            setSavingOrderKeyMap((prev) => ({ ...prev, [orderKey]: true }));
            await productService.updateOrderStatusAsAdmin({
                userId: order.userId,
                createdAt: order.createdAt,
                status: normalizedStatus,
            });
            showMessage("Order status updated", ESnackbarMsgVariant.success);
            await reloadCurrentPage();
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
            await reloadCurrentPage();
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
        return null;
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography variant="h4" component="h2">Order Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Review placed orders, order status, and shipping details.
                    </Typography>
                </Box>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshOrders}>
                    Refresh
                </Button>
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                <Typography variant="body2" color="text.secondary">
                    Page {currentPage}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={handlePreviousPage} disabled={isLoading || currentPage <= 1}>
                        Previous
                    </Button>
                    <Button variant="outlined" onClick={handleNextPage} disabled={isLoading || !nextToken}>
                        Next
                    </Button>
                </Stack>
            </Stack>

            <Paper>
                <TableContainer>
                    <Table size="small" aria-label="admin orders table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order ID</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Items</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Shipping</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                            No orders found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedOrders.map((order) => (
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
                                                    value={order.status ?? ""}
                                                    disabled={savingOrderKeyMap[getOrderKey(order)] === true || deletingOrderKeyMap[getOrderKey(order)] === true}
                                                    onChange={(event) => {
                                                        void handleOrderStatusChange(order, String(event.target.value));
                                                    }}
                                                >
                                                    {Array.from(new Set([...(order.status ? [order.status] : []), ...ORDER_STATUS_OPTIONS])).map((statusOption) => (
                                                        <MenuItem key={statusOption} value={statusOption}>{statusOption}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell>{order.products?.length || 0}</TableCell>
                                        <TableCell>{formatCurrency(order.total, order.currency || "INR")}</TableCell>
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
                                            <Tooltip title={deletingOrderKeyMap[getOrderKey(order)] === true ? "Deleting" : "Delete order"}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        aria-label="delete order"
                                                        onClick={() => handleDeleteOrder(order)}
                                                        disabled={deletingOrderKeyMap[getOrderKey(order)] === true || savingOrderKeyMap[getOrderKey(order)] === true}
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
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
