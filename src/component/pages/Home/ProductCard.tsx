import React from 'react';
import { useNavigate } from 'react-router';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';

import { Typography, Box, Paper, Button, Chip, IconButton } from '@mui/material';
import red from '@mui/material/colors/red';

import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import placeHolderImageString from 'url:./placeholderImage.png';

import IProductRecord from '../../../interface/product/IProductRecord';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';
import StarOutlined from '@mui/icons-material/StarOutlined';
import { getStockStatus } from './Helper';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const CARD_WIDTH = { xs: 175, md: 250 };
const ACTION_HALF_WIDTH = { p: 1, flexBasis: '50%' };

interface IProductCardProps {
    productRecord: IProductRecord;
    productVariantRecord: IProductVariantRecord[];

    currency?: string; //defaults to INR
    rating?: number; // defaults to number.NaN, which means no rating shown
    reviewCount?: number; // defaults to number.NaN, which means no review count shown
}

function getDefaultVariantRecord(productRecord: IProductRecord, variants: IProductVariantRecord[]): IProductVariantRecord | null {
    return variants.find((variant) => variant.variantId === productRecord.defaultVariantId) || variants[0] || null;
}

function formatPrice(priceInMinorUnit?: number): string {
    if (typeof priceInMinorUnit !== 'number') {
        return 'N/A';
    }
    return (priceInMinorUnit / 100).toFixed(2);
}

function getCartQuantity(
    cartProducts: Array<{ productId: string; variantId: string; quantity: number }> | undefined,
    productId: string,
    variantId: string | undefined
): number {
    return cartProducts?.find((item) => item.productId === productId && item.variantId === variantId)?.quantity ?? 0;
}

function RatingBadge(props: { rating?: number }) {
    if (!props.rating) {
        return null;
    }

    return (
        <Box
            sx={{
                backdropFilter: 'blur(5px)',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                px: 1,
            }}
            position='absolute'
            top={8}
            left={8}
        >
            <StarOutlined sx={{ color: 'goldenrod', fontSize: 20, verticalAlign: 'middle' }} />
            <Typography variant='subtitle2' component='span' fontWeight='bold' sx={{ ml: 0.5, verticalAlign: 'middle' }}>
                {props.rating.toFixed(1)}
            </Typography>
        </Box>
    );
}

function StockBadge(props: { stockCount: number }) {
    const stockStatus = getStockStatus(props.stockCount);
    return (
        <Chip
            label={stockStatus.statusText}
            color={stockStatus.statusColor}
            sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: 0.5,
            }}
        />
    );
}

export default function ProductCard(props: IProductCardProps) {
    const navigateTo = useNavigate();

    // Global Api
    const { showMessage, cartState, setCart } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Computed properties
    const cardImage = props.productRecord.imageUrls[0] || placeHolderImageString;
    const cardImageAlt = `${props.productRecord.name} Image`;
    const defaultVariantRecord = getDefaultVariantRecord(props.productRecord, props.productVariantRecord);
    const stockCount: number = defaultVariantRecord ? defaultVariantRecord.stock : 0;
    const maximumInOrder = defaultVariantRecord?.maximumInOrder;
    const cartQuantity = getCartQuantity(
        cartState.cartEntryRecord?.products,
        props.productRecord.productId,
        defaultVariantRecord?.variantId
    );

    // Private Methods
    function handleCardClick() {
        navigateTo(`/product/${props.productRecord.productId}`);
    }

    /**
     * Check if the given quantity exceeds the maximum allowed per order
     * @param quantity: The quantity to check
     * @returns True if the quantity exceeds the maximum allowed per order, otherwise false
     */
    function isExceedingMaxQuantityPerOrder(quantity: number): boolean {
        if (typeof maximumInOrder === 'number' && Number.isFinite(maximumInOrder)) {
            return quantity > maximumInOrder;
        }
        return true;
    }

    function handleSetQuantity(newQuantity: number) {
        if (!defaultVariantRecord) return;
        if (newQuantity < 0) return;

        if (isExceedingMaxQuantityPerOrder(newQuantity)) {
            showMessage(`Maximum quantity per order is ${maximumInOrder}.`, ESnackbarMsgVariant.warning);
            return;
        }

        const existingItems = cartState.cartEntryRecord?.products ?? [];
        const filteredItems = existingItems.filter(item => !(item.productId === props.productRecord.productId && item.variantId === defaultVariantRecord.variantId));
        const nextItems = newQuantity > 0
            ? [...filteredItems, { productId: props.productRecord.productId, variantId: defaultVariantRecord.variantId, quantity: newQuantity }]
            : filteredItems;

        setCart({ products: nextItems });
    }

    function handleAddToCart(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.preventDefault();
        e.stopPropagation();
        if (!defaultVariantRecord) return;
        if (stockCount <= 0) {
            showMessage(`This item is out of stock.`, ESnackbarMsgVariant.error);
            return;
        }
        const nextQuantity = cartQuantity + 1;
        if (isExceedingMaxQuantityPerOrder(nextQuantity)) {
            showMessage(`Maximum quantity per order is ${maximumInOrder}.`, ESnackbarMsgVariant.warning);
            return;
        }
        handleSetQuantity(nextQuantity);
        showMessage(`Added to cart: ${props.productRecord.name}`, ESnackbarMsgVariant.success);
    }

    function handleBuyNow(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        e.preventDefault();
        e.stopPropagation();
        showMessage(`Buy now not implemented yet!`, ESnackbarMsgVariant.error);
    }

    return(
        <Paper
            onClick={handleCardClick}
            sx={{
                transition: 'all 0.3s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                position: 'relative',
                cursor: 'pointer',
                '&:hover': {
                    boxShadow: 6,
                    transform: 'scale(1.01)',
                },
                width: CARD_WIDTH
            }}
        >
            <Box>
                <RatingBadge rating={props.rating} />
                <StockBadge stockCount={stockCount} />
                <Box component='img' src={cardImage} alt={cardImageAlt} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                <Box sx={{display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant='subtitle1' fontWeight='bold' sx={{ mx: 2, textAlign: "left", lineHeight: 1.2 }}>
                        {props.productRecord.name}
                    </Typography>
                    <Typography variant='body2' sx={{ mx: 2, textAlign: "left", color: red[700], fontWeight: 'bold' }} noWrap>
                        ₹{formatPrice(defaultVariantRecord?.price)}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex' }}>
                {cartQuantity > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexBasis: '50%', px: 1 }}>
                        <IconButton
                            size="small"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleSetQuantity(cartQuantity - 1);
                            }}
                            disabled={cartQuantity <= 0}
                        >
                            <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle1" fontWeight="bold">{cartQuantity}</Typography>
                        <IconButton
                            size="small"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleSetQuantity(cartQuantity + 1);
                            }}
                            disabled={stockCount <= 0}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                ) : (
                    <Button
                        color='primary'
                        variant="contained"
                        sx={ACTION_HALF_WIDTH}
                        startIcon={<ShoppingCartOutlinedIcon />}
                        onClick={handleAddToCart}
                        disabled={stockCount <= 0}
                    >
                        Add
                    </Button>
                )}
                <Button color='info' variant="contained" sx={ACTION_HALF_WIDTH} onClick={handleBuyNow} disabled={stockCount <= 0}>Buy Now</Button>
            </Box>
        </Paper>
    );
}
