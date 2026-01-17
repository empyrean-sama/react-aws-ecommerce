import React from "react";
import { useNavigate } from "react-router";
import { Box, Button, CircularProgress, Container, Divider, Paper, Stack, Typography } from "@mui/material";

import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";

export default function Cart() {
    const navigateTo = useNavigate();
    const { cart, cartItemCount, refreshCart, setCart } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    React.useEffect(() => {
        (async () => {
            setIsLoading(true);
            await refreshCart();
            setIsLoading(false);
        })();
    }, []);

    async function handleRefresh() {
        setIsLoading(true);
        await refreshCart();
        setIsLoading(false);
    }

    async function handleClearCart() {
        setIsLoading(true);
        await setCart({ products: [] });
        setIsLoading(false);
    }

    const isEmpty = !cart || cartItemCount === 0;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h1" component="h1">Cart</Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={handleRefresh} disabled={isLoading}>Refresh</Button>
                    <Button variant="contained" color="error" onClick={handleClearCart} disabled={isLoading || isEmpty}>Clear</Button>
                </Stack>
            </Stack>

            {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && isEmpty && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="h3" sx={{ mb: 1 }}>Your cart is empty</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Browse the catalog and add items to your cart.
                    </Typography>
                    <Button variant="contained" onClick={() => navigateTo("/")}>Continue shopping</Button>
                </Paper>
            )}

            {!isLoading && !isEmpty && (
                <Stack spacing={2}>
                    {cart?.products.map((item, index) => (
                        <Paper key={`${item.productId}-${item.variantId}-${index}`} sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Typography variant="h4">Product</Typography>
                                <Typography variant="body2" color="text.secondary">Product ID: {item.productId}</Typography>
                                <Typography variant="body2" color="text.secondary">Variant ID: {item.variantId}</Typography>
                                <Divider />
                                <Typography variant="body1">Quantity: {item.quantity}</Typography>
                            </Stack>
                        </Paper>
                    ))}
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Typography variant="h3">Total items: {cartItemCount}</Typography>
                    </Box>
                </Stack>
            )}
        </Container>
    );
}
