import React from "react";
import { useNavigate } from "react-router";
import { Avatar, Box, Button, CircularProgress, Container, Divider, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, IconButton } from "@mui/material";

import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ProductService from "../../../service/ProductService";
import placeHolderImageString from "url:../Home/placeholderImage.png";
import IProductRecord from "../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import AuthService from "../../../service/AuthService";
import ICartEntryRecord from "../../../interface/product/ICartEntryRecord";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";
import { ICartEntryItem } from "../../../interface/product/ICartEntry";

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from "@mui/icons-material/Refresh";

interface ICartPageContextAPI {
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const cartPageContext = React.createContext<ICartPageContextAPI | null>(null);

export default function Cart() {
    
    // Services & Global API
    const productService = ProductService.getInstance();
    const authService = AuthService.getInstance();
    const navigate = useNavigate();
    const { showMessage, refreshCart, cartState } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // State variables
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    // Effects
    React.useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                setIsLoading(true);
                await refreshCart();
            }
            catch(error) {
                console.error("Failed to load cart items", error);
                showMessage("Failed to load cart items", ESnackbarMsgVariant.error);
            }
            finally {
                if(isMounted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    // Private routines
    
    return (
        <cartPageContext.Provider value={{ isLoading, setIsLoading }}>
            <LoadingEnclosure isLoading={isLoading}>
                <Container maxWidth="xl" sx={{ pt: 4, px: { xs: 0, md: 4} }}>
                    <CartHeader />
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, alignItems: 'flex-start' }}>
                        <CartItemViewerPanel />
                        <CartSummaryPanel />
                    </Box>
                </Container>
            </LoadingEnclosure>
        </cartPageContext.Provider>
    );
}

function LoadingEnclosure(props: { isLoading: boolean, children?: React.ReactNode }) {
    if (props.isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
                <CircularProgress />
            </Box>
        );
    } else {
        return <>{props.children}</>;
    }
}

function CartHeader() {

    // Global State & Services
    const { cartState, showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const { isLoading, setIsLoading } = React.useContext(cartPageContext) as ICartPageContextAPI;

    // Private routines
    async function handleRefresh(): Promise<void> {

    }

    async function handleClearCart(): Promise<void> {

    }

    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: { xs: 2, md: 0 } }}>
            <Typography variant="h1" component="h1">Cart</Typography>
            <Stack direction="row" spacing={1}>
                <Button 
                    variant="outlined" 
                    onClick={handleRefresh} 
                    disabled={isLoading} startIcon={<RefreshIcon />}
                >
                    Refresh
                </Button>
                <Button 
                    variant="contained" 
                    color="error" 
                    onClick={handleClearCart} 
                    disabled={isLoading || cartState.cartEntryRecord?.products.length === 0} 
                    startIcon={<DeleteIcon />}
                >
                    Clear
                </Button>
            </Stack>
        </Stack>
    )
}

function CartItemViewerPanel() {

    // Global State & Services
    const { cartState } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Private routines
    async function handleIncreaseQuantity(productId: string, variantId: string): Promise<void> {

    }

    async function handleDecreaseQuantity(productId: string, variantId: string): Promise<void> {

    }

    return (
        <Paper sx={{ p: {xs: 0, md: 2}, flexBasis: { xs: '100%', md: "66%", lg: "60%" },  width: "100%" }}>
            <Typography variant="h4" component="h2" sx={{ textAlign: { xs: 'center', md: 'left' }, pt: { xs: 2, md: 0 }}}>
                Items In Your Cart
            </Typography>
            {/* <Divider /> */}
            <TableContainer>
                <Table size="small" aria-label="cart items">
                    <TableHead>
                        <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }}}>Price</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }}}>Quantity</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }}}>Total</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'table-cell', md: 'none' }}}>Cost</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'table-cell', md: 'none' }}}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cartState.cartEntryRecord?.products.map((cartEntry: ICartEntryItem) => 
                            {
                                const priceInPaise = cartState.productIdToVariantsRecordMap[cartEntry.productId].find(variant => variant.variantId === cartEntry.variantId)?.price;
                                let priceInRupees = 0;
                                if(priceInPaise !== undefined && priceInPaise !== 0) {
                                    priceInRupees = priceInPaise / 100;
                                }
                                return( 
                                    <TableRow key={cartEntry.productId}>
                                        <TableCell>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar 
                                                    variant="square"
                                                    src={cartState.productIdToProductRecordMap[cartEntry.productId]?.imageUrls?.[0] || placeHolderImageString}
                                                    alt={cartState.productIdToProductRecordMap[cartEntry.productId]?.name || 'Product Image'}
                                                    sx={{ width: { xs: 64, sm: 96, md: 128 }, height: { xs: 64, sm: 96, md: 128 } }}
                                                />
                                                <Typography variant="body1">{cartState.productIdToProductRecordMap[cartEntry.productId]?.name || 'Unnamed Product'} ({cartState.productIdToVariantsRecordMap[cartEntry.productId]?.find(variant => variant.variantId === cartEntry.variantId)?.name || ''})</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }}}><Typography variant="body1">₹{priceInRupees}</Typography></TableCell>
                                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }}}>
                                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                                                <IconButton aria-label="decrease quantity" size="small" sx={{ display: { xs: 'none', md: 'table-cell' }}} onClick={() => handleDecreaseQuantity(cartEntry.productId, cartEntry.variantId)}>
                                                    <RemoveIcon fontSize="inherit" />
                                                </IconButton>
                                                <Typography variant="body1" sx={{pb: {xs: 0, md: .5}}}>{cartEntry.quantity}</Typography>
                                                <IconButton aria-label="increase quantity" size="small" sx={{ display: { xs: 'none', md: 'table-cell' }}} onClick={() => handleIncreaseQuantity(cartEntry.productId, cartEntry.variantId)}>
                                                    <AddIcon fontSize="inherit" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' }}}>
                                            <Typography variant="body1">₹{priceInRupees * cartEntry.quantity}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ display: { xs: 'table-cell', md: 'none' }}}><Typography variant="body1" textAlign="center">₹{priceInRupees} x {cartEntry.quantity} = ₹{priceInRupees * cartEntry.quantity}</Typography></TableCell>
                                        <TableCell align="center" sx={{ display: { xs: 'table-cell', md: 'none' }}}>
                                            <IconButton aria-label="increase quantity" size="large" onClick={() => handleIncreaseQuantity(cartEntry.productId, cartEntry.variantId)}>
                                                <AddIcon fontSize="inherit" />
                                            </IconButton>
                                            <IconButton aria-label="decrease quantity" size="large" onClick={() => handleDecreaseQuantity(cartEntry.productId, cartEntry.variantId)}>
                                                <RemoveIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            }
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

function CartSummaryPanel() {

    // Global State & Services
    const { cartState, cartItemCount } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const navigateTo = useNavigate();

    // Computed values
    const subtotal = cartState.cartEntryRecord?.products.reduce((total, item) => {
        const priceInPaise = cartState.productIdToVariantsRecordMap[item.productId].find(variant => variant.variantId === item.variantId)?.price;
        let priceInRupees = 0;
        if(priceInPaise !== undefined && priceInPaise !== 0) {
            priceInRupees = priceInPaise / 100;
        }
        return total + (priceInRupees * item.quantity);
    }, 0) || 0;

    // Private routines
    function formatPrice(amount: number): string {
        return `₹${amount.toFixed(2)}`;
    }

    return (
         <Paper sx={{ p: 2, flexBasis: { xs: '100%', md: "34%", lg: "40%" }, position: 'sticky', top: { xs: 'auto', md: 32 }, alignSelf: 'flex-start', order: { xs: -1, md: 0 }, width: "100%", boxShadow: {xs: 0, md: 1} }}>
            <Stack spacing={2}>
                <Typography variant="h4" component="h2">Order Summary</Typography>
                <Divider />
                <Stack spacing={1}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body1" color="text.secondary">Items</Typography>
                        <Typography variant="body1" fontWeight={600}>{cartItemCount}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body1" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body1" fontWeight={600}>{formatPrice(subtotal)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body1" color="text.secondary">Shipping</Typography>
                        <Typography variant="body1" fontWeight={600}>Calculated at checkout</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body1" fontWeight={700}>Total</Typography>
                        <Typography variant="body1" fontWeight={700}>{formatPrice(subtotal)}</Typography>
                    </Box>
                </Stack>
                <Stack>
                    <Button variant="contained" color="info" fullWidth size="large">Proceed to checkout</Button>
                    <Button variant="outlined" fullWidth size="small" onClick={() => navigateTo("/")}>Continue shopping</Button>
                </Stack>
            </Stack>
        </Paper>
    );
}