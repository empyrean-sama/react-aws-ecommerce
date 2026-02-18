import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import ProductService from '../../../service/ProductService';
import ProfileService from '../../../service/ProfileService';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';
import IAddress, { createEmptyAddress } from '../../../interface/IAddress';
import IAddressRecord from '../../../interface/IAddressRecord';
import ICheckoutItemInput from '../../../interface/order/ICheckoutItemInput';
import Constants from '../../../Constants';
import CreateAddressPanel, { ISaveAddressErrorStates } from '../User/CreateAddressPanel';
import {
    areCoordinatesValid,
    isAreaValid,
    isCityValid,
    isCountryValid,
    isLabelValid,
    isPostcodeValid,
    isSpecificAddressValid,
    isStateValid,
    isStreetValid,
} from '../../../Helper';

type CheckoutMode = 'cart' | 'single';

declare global {
    interface Window {
        Razorpay?: any;
    }
}

interface ICheckoutDisplayItem {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
}

function isValidAddress(address: IAddress): boolean {
    const requiredValues = [
        address.phoneNumber,
        address.specificAddress,
        address.street,
        address.area,
        address.postcode,
        address.city,
        address.state,
        address.country,
    ];

    return requiredValues.every((value) => typeof value === 'string' && value.trim().length > 0);
}

function formatPriceFromPaise(amount: number): string {
    return `₹${(amount / 100).toFixed(2)}`;
}

function loadRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function Checkout() {
    const [searchParams] = useSearchParams();
    const navigateTo = useNavigate();

    const productService = ProductService.getInstance();
    const profileService = ProfileService.getInstance();

    const { getLoggedInDetails, authService, setCart, showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [items, setItems] = React.useState<ICheckoutDisplayItem[]>([]);

    const [savedAddresses, setSavedAddresses] = React.useState<IAddressRecord[]>([]);
    const [selectedAddressId, setSelectedAddressId] = React.useState<string>('');
    const [useSavedAddress, setUseSavedAddress] = React.useState<boolean>(true);
    const [manualAddress, setManualAddress] = React.useState<IAddress>(createEmptyAddress());
    const [isOneTimeAddressBusy, setIsOneTimeAddressBusy] = React.useState<boolean>(false);

    const loggedInUser = getLoggedInDetails();
    const isAuthenticated = Boolean(loggedInUser?.userId);

    const checkoutMode: CheckoutMode = searchParams.get('mode') === 'single' ? 'single' : 'cart';

    React.useEffect(() => {
        let isMounted = true;

        (async function bootstrapCheckout() {
            try {
                setIsLoading(true);

                const nextItems: ICheckoutDisplayItem[] = [];

                if (checkoutMode === 'cart') {
                    const cartRecord = await authService.getCart();
                    const cartItems = cartRecord?.products ?? [];
                    for (const cartItem of cartItems) {
                        const [product, variants] = await Promise.all([
                            productService.getProductById(cartItem.productId),
                            productService.getVariantsByProductId(cartItem.productId),
                        ]);
                        const variant = (variants ?? []).find((entry) => entry.variantId === cartItem.variantId);
                        if (!product || !variant) {
                            continue;
                        }

                        nextItems.push({
                            productId: product.productId,
                            variantId: variant.variantId,
                            productName: product.name,
                            variantName: variant.name,
                            quantity: cartItem.quantity,
                            unitPrice: variant.price,
                            imageUrl: product.imageUrls?.[0] ?? '',
                        });
                    }
                } else {
                    const productId = searchParams.get('productId')?.trim() ?? '';
                    const variantId = searchParams.get('variantId')?.trim() ?? '';
                    const quantityRaw = Number(searchParams.get('quantity') ?? 1);
                    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;

                    if (!productId || !variantId) {
                        throw new Error('Missing product or variant details for single-item checkout');
                    }

                    const [product, variants] = await Promise.all([
                        productService.getProductById(productId),
                        productService.getVariantsByProductId(productId),
                    ]);
                    const variant = (variants ?? []).find((entry) => entry.variantId === variantId);

                    if (!product || !variant) {
                        throw new Error('Unable to load selected product for checkout');
                    }

                    nextItems.push({
                        productId: product.productId,
                        variantId: variant.variantId,
                        productName: product.name,
                        variantName: variant.name,
                        quantity,
                        unitPrice: variant.price,
                        imageUrl: product.imageUrls?.[0] ?? '',
                    });
                }

                if (!isMounted) {
                    return;
                }

                setItems(nextItems);

                if (isAuthenticated && loggedInUser?.userId) {
                    const addresses = await profileService.getAddressesByUserId(loggedInUser.userId);
                    if (!isMounted) {
                        return;
                    }

                    const nextAddresses = addresses ?? [];
                    setSavedAddresses(nextAddresses);

                    if (nextAddresses.length > 0) {
                        setSelectedAddressId(nextAddresses[0].addressId);
                        setUseSavedAddress(true);
                    } else {
                        setUseSavedAddress(false);
                    }
                } else {
                    setUseSavedAddress(false);
                }
            } catch (error: any) {
                if (isMounted) {
                    console.error('Checkout bootstrap failed', error);
                    showMessage(error?.message || 'Unable to load checkout', ESnackbarMsgVariant.error);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [checkoutMode, isAuthenticated, loggedInUser?.userId]);

    const checkoutItems = React.useMemo<ICheckoutItemInput[]>(() => items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
    })), [items]);
    const totalItems = React.useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    const subtotal = React.useMemo(() => items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0), [items]);
    const shippingFee = 0;
    const tax = 0;
    const total = subtotal + shippingFee + tax;

    const selectedSavedAddress = React.useMemo(() => savedAddresses.find((address) => address.addressId === selectedAddressId) ?? null, [savedAddresses, selectedAddressId]);

    const shippingAddress = useSavedAddress ? selectedSavedAddress : manualAddress;
    const canProceed = items.length > 0 && !!shippingAddress && isValidAddress(shippingAddress);

    function handleValidateAndUseOneTimeAddress(callbacks: ISaveAddressErrorStates) {
        const specificAddressValidation = isSpecificAddressValid(manualAddress.specificAddress);
        const areaValidation = isAreaValid(manualAddress.area);
        const cityValidation = isCityValid(manualAddress.city);
        const stateValidation = isStateValid(manualAddress.state);
        const countryValidation = isCountryValid(manualAddress.country);
        const postcodeValidation = isPostcodeValid(manualAddress.postcode);
        const streetValidation = isStreetValid(manualAddress.street);
        const labelValidation = isLabelValid('One-time address');
        const coordinatesValidation = areCoordinatesValid(manualAddress.latitude, manualAddress.longitude);

        callbacks.setSpecificAddressError(specificAddressValidation.errorMessage);
        callbacks.setAreaError(areaValidation.errorMessage);
        callbacks.setCityError(cityValidation.errorMessage);
        callbacks.setStateError(stateValidation.errorMessage);
        callbacks.setCountryError(countryValidation.errorMessage);
        callbacks.setPostCodeError(postcodeValidation.errorMessage);
        callbacks.setStreetError(streetValidation.errorMessage);
        callbacks.setLabelError(labelValidation.errorMessage);

        const coordinatesValid = callbacks.areLocationCoordinatesAvailable ? coordinatesValidation.isValid : true;

        if (
            specificAddressValidation.isValid
            && areaValidation.isValid
            && cityValidation.isValid
            && stateValidation.isValid
            && countryValidation.isValid
            && postcodeValidation.isValid
            && streetValidation.isValid
            && labelValidation.isValid
            && coordinatesValid
        ) {
            showMessage('One-time delivery address is ready.', ESnackbarMsgVariant.success);
        }
    }

    function handleResetOneTimeAddress() {
        setManualAddress(createEmptyAddress());
    }

    async function handlePayNow() {
        if (!shippingAddress || !isValidAddress(shippingAddress)) {
            showMessage('Please provide a valid shipping address.', ESnackbarMsgVariant.warning);
            return;
        }

        if (checkoutItems.length === 0) {
            showMessage('No items to checkout.', ESnackbarMsgVariant.warning);
            return;
        }

        try {
            setIsSubmitting(true);

            const guestUserId = localStorage.getItem(Constants.LOCAL_STORAGE_GUEST_CHECKOUT_USER_KEY) || undefined;
            const normalizedShippingAddress: IAddress = {
                ...shippingAddress,
                userLabel: shippingAddress.userLabel?.trim() ? shippingAddress.userLabel.trim() : 'One-time address',
            };

            const session = await productService.createCheckoutSession({
                source: checkoutMode,
                items: checkoutItems,
                shippingAddress: normalizedShippingAddress,
                customerName: loggedInUser?.givenName ? `${loggedInUser.givenName} ${loggedInUser.familyName || ''}`.trim() : undefined,
                customerEmail: loggedInUser?.email,
                customerPhone: normalizedShippingAddress.phoneNumber,
                guestUserId,
            }, isAuthenticated);

            if (!isAuthenticated && session.guestUserId) {
                localStorage.setItem(Constants.LOCAL_STORAGE_GUEST_CHECKOUT_USER_KEY, session.guestUserId);
            }

            const razorpayLoaded = await loadRazorpayScript();
            if (!razorpayLoaded || !window.Razorpay) {
                throw new Error('Razorpay checkout failed to load');
            }

            const options = {
                key: session.razorpayKeyId,
                amount: session.amount,
                currency: session.currency,
                name: 'Srividhya-Foods',
                description: checkoutMode === 'cart' ? 'Cart checkout' : 'Single item checkout',
                order_id: session.razorpayOrderId,
                prefill: {
                    name: loggedInUser?.givenName ? `${loggedInUser.givenName} ${loggedInUser.familyName || ''}`.trim() : undefined,
                    email: loggedInUser?.email,
                    contact: loggedInUser?.phoneNumber,
                },
                theme: {
                    color: '#2E7D32',
                },
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    try {
                        await productService.confirmCheckoutPayment({
                            orderId: session.orderId,
                            createdAt: session.createdAt,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            guestUserId: session.guestUserId,
                        }, isAuthenticated);

                        if (checkoutMode === 'cart') {
                            await setCart({ products: [] });
                        }

                        showMessage('Payment successful. Your order has been placed.', ESnackbarMsgVariant.success);
                        navigateTo('/order-placed', {
                            state: {
                                fromCheckoutSuccess: true,
                                orderId: session.orderId,
                                itemCount: totalItems,
                                totalAmount: total,
                            },
                            replace: true,
                        });
                    } catch (error: any) {
                        showMessage(error?.message || 'Payment confirmation failed', ESnackbarMsgVariant.error);
                    } finally {
                        setIsSubmitting(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsSubmitting(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error: any) {
            console.error('Checkout failed', error);
            showMessage(error?.message || 'Unable to start payment', ESnackbarMsgVariant.error);
            setIsSubmitting(false);
        }
    }

    const orderSummarySection = (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1.1}>
                <Typography variant="h4">Order Summary</Typography>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatPriceFromPaise(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Shipping</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatPriceFromPaise(shippingFee)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Tax</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatPriceFromPaise(tax)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight={700}>Total</Typography>
                    <Typography variant="body1" fontWeight={700}>{formatPriceFromPaise(total)}</Typography>
                </Box>

                <Button
                    variant="contained"
                    color="info"
                    size="large"
                    fullWidth
                    onClick={handlePayNow}
                    disabled={!canProceed || isSubmitting}
                    sx={{
                        py: 1.4,
                        fontSize: { xs: '1rem', md: '1.05rem' },
                    }}
                >
                    {isSubmitting ? 'Processing…' : 'Pay with Razorpay'}
                </Button>
            </Stack>
        </Paper>
    );

    if (isLoading) {
        return (
            <Box sx={{ width: '100%', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
                <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="h1">Checkout</Typography>
                        <Chip
                            size="small"
                            color={checkoutMode === 'cart' ? 'primary' : 'secondary'}
                            label={checkoutMode === 'cart' ? 'Cart Checkout' : 'Single Item Checkout'}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Secure payment powered by Razorpay. Review your address and order summary before placing the order.
                    </Typography>
                </Stack>
            </Paper>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} alignItems="flex-start">
                <Stack spacing={2.5} sx={{ width: '100%', flexBasis: { lg: '65%' } }}>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, width: '100%', borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="h4" sx={{ lineHeight: 1.2 }}>Items</Typography>
                            <Divider sx={{ my: 0 }} />

                            {items.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">No items selected for checkout.</Typography>
                            ) : (
                                <Stack spacing={1.5}>
                                    {items.map((item) => (
                                        <Box key={`${item.productId}-${item.variantId}`} sx={{ p: 1.25, borderRadius: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar variant="rounded" src={item.imageUrl || undefined} alt={item.productName} sx={{ width: 64, height: 64 }} />
                                                <Stack sx={{ flexGrow: 1 }}>
                                                    <Typography variant="body1" fontWeight={600}>{item.productName}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{item.variantName}</Typography>
                                                </Stack>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" color="text.secondary">Qty: {item.quantity}</Typography>
                                                    <Typography variant="body2" fontWeight={700}>{formatPriceFromPaise(item.unitPrice * item.quantity)}</Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>

                    <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                        {orderSummarySection}
                    </Box>
                </Stack>

                <Stack spacing={2.5} sx={{ width: '100%', flexBasis: { lg: '35%' }, position: { lg: 'sticky' }, top: { lg: 24 } }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="h4" sx={{ lineHeight: 1.2 }}>Delivery Address</Typography>
                            <Divider sx={{ my: 0 }} />

                            {isAuthenticated && savedAddresses.length > 0 && (
                                <TextField
                                    select
                                    label="Address source"
                                    size="small"
                                    value={useSavedAddress ? 'saved' : 'manual'}
                                    onChange={(event) => setUseSavedAddress(event.target.value === 'saved')}
                                >
                                    <MenuItem value="saved">Use saved address</MenuItem>
                                    <MenuItem value="manual">Use one-time address</MenuItem>
                                </TextField>
                            )}

                            {useSavedAddress && savedAddresses.length > 0 ? (
                                <>
                                    <TextField
                                        select
                                        label="Saved address"
                                        size="small"
                                        value={selectedAddressId}
                                        onChange={(event) => setSelectedAddressId(event.target.value)}
                                    >
                                        {savedAddresses.map((address) => (
                                            <MenuItem key={address.addressId} value={address.addressId}>
                                                {address.userLabel} — {address.specificAddress}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    {selectedSavedAddress && (
                                        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                                            <Typography variant="subtitle2" fontWeight={600}>{selectedSavedAddress.userLabel}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {selectedSavedAddress.specificAddress}, {selectedSavedAddress.area}, {selectedSavedAddress.city}, {selectedSavedAddress.state} {selectedSavedAddress.postcode}
                                            </Typography>
                                        </Paper>
                                    )}
                                </>
                            ) : (
                                <CreateAddressPanel
                                    formMode="New Address"
                                    isLoading={isOneTimeAddressBusy}
                                    setIsLoading={setIsOneTimeAddressBusy}
                                    addressToEdit={manualAddress}
                                    setAddressToEdit={setManualAddress}
                                    onCancelForm={handleResetOneTimeAddress}
                                    onSaveAddress={handleValidateAndUseOneTimeAddress}
                                    primaryActionLabel="Use this address"
                                    showActionButtons={false}
                                    isEmbedded={true}
                                    showFormModeChip={false}
                                    showLabelField={false}
                                />
                            )}
                        </Stack>
                    </Paper>

                    <Box sx={{ display: { xs: 'block', lg: 'none' }, width: '100%' }}>
                        {orderSummarySection}
                    </Box>
                </Stack>
            </Stack>
        </Container>
    );
}
