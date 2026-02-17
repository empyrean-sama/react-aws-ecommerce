import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Container,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';

import ProductService from '../../../service/ProductService';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import IProductRecord from '../../../interface/product/IProductRecord';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import IProductField from '../../../interface/product/field/IProductField';
import ISectionField from '../../../interface/product/field/ISectionField';
import ITableField from '../../../interface/product/field/ITableField';
import EProductFieldType from '../../../enum/EProductFieldType';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';
import { getStockStatus } from '../Home/Helper';
import placeHolderImageString from 'url:../Home/placeholderImage.png';
import { getProductPath, toProductSlug } from '../../../helper/ProductUrlHelper';

const CURRENCY_SYMBOL = '₹';

function formatPrice(price?: number): string {
    if (typeof price !== 'number') {
        return 'N/A';
    }
    return `${CURRENCY_SYMBOL}${(price / 100).toFixed(2)}`;
}

function getDefaultVariant(product: IProductRecord, variants: IProductVariantRecord[]): IProductVariantRecord | null {
    return variants.find((variant) => variant.variantId === product.defaultVariantId) || variants[0] || null;
}

function getFriendlyStockText(stockCount: number): string {
    if (stockCount > 10) {
        return 'Ready to ship';
    }
    if (stockCount > 0) {
        return `Only ${stockCount} left`;
    }
    return 'Currently unavailable';
}

function getMaxPurchasable(stockCount: number, maximumInOrder: number | undefined): number {
    if (!Number.isFinite(stockCount) || stockCount <= 0) {
        return 0;
    }
    if (typeof maximumInOrder === 'number' && Number.isFinite(maximumInOrder) && maximumInOrder >= 0) {
        return Math.min(stockCount, maximumInOrder);
    }
    return stockCount;
}

function ProductFieldRenderer(props: { field: IProductField; index: number }) {
    const { field, index } = props;

    if (field.type === EProductFieldType.section) {
        const section = field as ISectionField;
        return (
            <Accordion key={`section-${index}`} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <DescriptionOutlinedIcon fontSize="small" color="action" />
                        <Typography variant="h2">{section.sectionTitle}</Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                        {section.sectionDescription}
                    </Typography>
                </AccordionDetails>
            </Accordion>
        );
    }

    if (field.type === EProductFieldType.table) {
        const table = field as ITableField;
        return (
            <Accordion key={`table-${index}`} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TableChartOutlinedIcon fontSize="small" color="action" />
                        <Typography variant="h2">{table.tableName}</Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {table.columns.map((column, columnIndex) => (
                                        <TableCell key={`${table.tableName}-col-${columnIndex}`}>{column}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {table.rows.map((row, rowIndex) => (
                                    <TableRow key={`${table.tableName}-row-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <TableCell key={`${table.tableName}-${rowIndex}-${cellIndex}`}>{cell}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>
        );
    }

    return null;
}

export default function ProductDetails() {
    const { collectionSlug, productSlug } = useParams();
    const navigateTo = useNavigate();
    const productService = ProductService.getInstance();

    const { showMessage, cartState, setCart } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [product, setProduct] = React.useState<IProductRecord | null>(null);
    const [variants, setVariants] = React.useState<IProductVariantRecord[]>([]);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string>('');
    const [selectedImageIndex, setSelectedImageIndex] = React.useState<number>(0);

    async function resolveProductBySlugs(collectionSlugValue: string, productSlugValue: string): Promise<{ product: IProductRecord; collectionName: string } | null> {
        const normalizedCollectionSlug = toProductSlug(collectionSlugValue);
        const normalizedProductSlug = toProductSlug(productSlugValue);
        const collections = await productService.listCollections();
        if (!collections || collections.length === 0) {
            return null;
        }

        const targetCollection = collections.find((collection) => toProductSlug(collection.name) === normalizedCollectionSlug);
        if (!targetCollection) {
            return null;
        }

        const products = await productService.getProductsByCollectionId(targetCollection.collectionId);
        const matchedProduct = (products ?? []).find((productRecord) => toProductSlug(productRecord.name) === normalizedProductSlug);
        if (!matchedProduct) {
            return null;
        }

        return { product: matchedProduct, collectionName: targetCollection.name };
    }

    React.useEffect(() => {
        let isMounted = true;

        (async function loadProduct() {
            try {
                setIsLoading(true);

                if (!collectionSlug || !productSlug) {
                    if (isMounted) {
                        setProduct(null);
                        setVariants([]);
                    }
                    return;
                }

                const resolvedProduct = await resolveProductBySlugs(collectionSlug, productSlug);
                const fetchedProduct = resolvedProduct?.product ?? null;
                const fetchedVariants = fetchedProduct
                    ? await productService.getVariantsByProductId(fetchedProduct.productId)
                    : [];

                if (!isMounted) {
                    return;
                }

                setProduct(fetchedProduct);
                const resolvedVariants = fetchedVariants ?? [];
                setVariants(resolvedVariants);

                if (fetchedProduct && resolvedProduct) {
                    const defaultVariant = getDefaultVariant(fetchedProduct, resolvedVariants);
                    setSelectedVariantId(defaultVariant?.variantId ?? '');

                    const canonicalCollectionSlug = toProductSlug(resolvedProduct.collectionName);
                    const canonicalProductSlug = toProductSlug(fetchedProduct.name);
                    if (collectionSlug !== canonicalCollectionSlug || productSlug !== canonicalProductSlug) {
                        navigateTo(getProductPath(resolvedProduct.collectionName, fetchedProduct.name), { replace: true });
                    }
                }
            } catch (error) {
                console.error('Error loading product details:', error);
                if (isMounted) {
                    showMessage('Unable to load product details right now', ESnackbarMsgVariant.error);
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
    }, [collectionSlug, productSlug]);

    const selectedVariant = variants.find((variant) => variant.variantId === selectedVariantId)
        || getDefaultVariant(product as IProductRecord, variants)
        || null;

    const stockCount = selectedVariant?.stock ?? 0;
    const stockStatus = getStockStatus(stockCount);
    const friendlyStockText = getFriendlyStockText(stockCount);
    const maximumInOrder = selectedVariant?.maximumInOrder;
    const maxPurchasable = getMaxPurchasable(stockCount, maximumInOrder);

    const cartQuantity = cartState.cartEntryRecord?.products?.find(
        (item) => item.productId === product?.productId && item.variantId === selectedVariant?.variantId
    )?.quantity ?? 0;

    const canDecreaseQuantity = !!selectedVariant && cartQuantity > 0;
    const canIncreaseQuantity = !!selectedVariant && stockCount > 0 && cartQuantity < maxPurchasable;
    const isInCart = cartQuantity > 0;

    const primaryCartButtonLabel = isInCart ? 'View cart' : 'Add to cart';
    const primaryCartButtonIcon = isInCart ? <ShoppingCartRoundedIcon /> : <AddShoppingCartRoundedIcon />;
    const primaryCartButtonDisabled = isInCart ? false : (stockCount <= 0 || !selectedVariant);

    function handleSetQuantity(newQuantity: number) {
        if (!product || !selectedVariant) return;
        if (newQuantity < 0) return;

        if (newQuantity > maxPurchasable) {
            showMessage(`Maximum quantity per order is ${maxPurchasable}.`, ESnackbarMsgVariant.warning);
            return;
        }

        const existingItems = cartState.cartEntryRecord?.products ?? [];
        const filteredItems = existingItems.filter(
            (item) => !(item.productId === product.productId && item.variantId === selectedVariant.variantId)
        );

        const nextItems = newQuantity > 0
            ? [...filteredItems, { productId: product.productId, variantId: selectedVariant.variantId, quantity: newQuantity }]
            : filteredItems;

        setCart({ products: nextItems });
    }

    function handleAddToCart() {
        if (!selectedVariant) return;
        if (stockCount <= 0) {
            showMessage('This item is out of stock.', ESnackbarMsgVariant.error);
            return;
        }

        const nextQuantity = cartQuantity + 1;
        if (nextQuantity > maxPurchasable) {
            showMessage(`Maximum quantity per order is ${maxPurchasable}.`, ESnackbarMsgVariant.warning);
            return;
        }

        handleSetQuantity(nextQuantity);
        showMessage(`Added to cart: ${product?.name}`, ESnackbarMsgVariant.success);
    }

    function handlePrimaryCartButtonClick() {
        if (isInCart) {
            navigateTo('/cart');
            return;
        }
        handleAddToCart();
    }

    function handleBuyNow() {
        showMessage('Buy now not implemented yet!', ESnackbarMsgVariant.info);
    }

    if (isLoading) {
        return (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!product) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h4">Product not found</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        The product you are trying to view does not exist.
                    </Typography>
                    <Button variant="contained" onClick={() => navigateTo('/')}>Go Home</Button>
                </Paper>
            </Container>
        );
    }

    const images = product.imageUrls.length > 0 ? product.imageUrls : [placeHolderImageString];
    const selectedImage = images[selectedImageIndex] || images[0] || placeHolderImageString;

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, pb: { xs: 12, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5  }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' }, gap: 2 }}>
                <Paper sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                        component="img"
                        src={selectedImage}
                        alt={`${product.name} image`}
                        sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1 }}
                    />

                    {images.length > 1 && (
                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                            {images.map((image, index) => (
                                <ButtonBase
                                    key={`${product.productId}-image-${index}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                    sx={{
                                        border: selectedImageIndex === index ? '2px solid' : '1px solid',
                                        borderColor: selectedImageIndex === index ? 'primary.main' : 'divider',
                                        borderRadius: 1,
                                        width: 72,
                                        height: 72,
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Box component="img" src={image} alt={`${product.name} thumbnail ${index + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </ButtonBase>
                            ))}
                        </Stack>
                    )}
                </Paper>

                <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    
                    <Stack spacing={1}>
                        <Typography variant="h2" component="h1" sx={{ lineHeight: 1.1 }}>
                            {product.name}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={friendlyStockText} color={stockStatus.statusColor} />
                            {product.favourite === 'true' && <Chip label="Popular choice" variant="outlined" color="warning" />}
                        </Stack>
                    </Stack>

                    {product.description && (
                        <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                            {product.description}
                        </Typography>
                    )}

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <SellOutlinedIcon color="error" />
                                    <Typography variant="h3" color="error.main">
                                        {formatPrice(selectedVariant?.price)}
                                    </Typography>
                                </Stack>

                                {selectedVariant && (
                                    <TextField
                                        select
                                        label="Option"
                                        size="small"
                                        value={selectedVariant.variantId}
                                        onChange={(event) => setSelectedVariantId(event.target.value)}
                                        sx={{ minWidth: { xs: 170, sm: 220 }, width: { xs: '100%', sm: 'auto' } }}
                                    >
                                        {variants.map((variant) => (
                                            <MenuItem key={variant.variantId} value={variant.variantId}>
                                                {variant.name} · {formatPrice(variant.price)}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            </Stack>

                            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Inventory2OutlinedIcon fontSize="small" color={stockStatus.statusColor} />
                                    <Typography variant="body2" color="text.secondary">{friendlyStockText}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <LocalShippingOutlinedIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">Fast delivery available</Typography>
                                </Stack>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                    onClick={() => handleSetQuantity(cartQuantity - 1)}
                                    disabled={!canDecreaseQuantity}
                                    sx={{ border: 1, borderColor: 'divider', width: 40, height: 40 }}
                                >
                                    <RemoveIcon />
                                </IconButton>
                                <Typography variant="h5" sx={{ minWidth: 32, textAlign: 'center' }}>{cartQuantity}</Typography>
                                <IconButton
                                    onClick={() => handleSetQuantity(cartQuantity + 1)}
                                    disabled={!canIncreaseQuantity}
                                    sx={{ border: 1, borderColor: 'divider', width: 40, height: 40 }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ display: { xs: 'none', md: 'flex' } }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={primaryCartButtonIcon}
                                    onClick={handlePrimaryCartButtonClick}
                                    disabled={primaryCartButtonDisabled}
                                    sx={{ minHeight: 48, flex: 1 }}
                                >
                                    {primaryCartButtonLabel}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="info"
                                    size="large"
                                    startIcon={<ShoppingCartCheckoutRoundedIcon />}
                                    onClick={handleBuyNow}
                                    disabled={stockCount <= 0 || !selectedVariant}
                                    sx={{ minHeight: 48, flex: 1 }}
                                >
                                    Buy now
                                </Button>
                            </Stack>
                        </Stack>
                    </Paper>
                </Paper>
            </Box>

            {Array.isArray(product.tags) && product.tags.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <SellOutlinedIcon fontSize="small" color="action" />
                        <Typography variant="h6">Browse by tags</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {product.tags.map((tag) => (
                            <Chip key={`${product.productId}-tag-${tag}`} label={tag} variant="outlined" />
                        ))}
                    </Stack>
                </Paper>
            )}

            {Array.isArray(product.fields) && product.fields.length > 0 && (
                <Stack spacing={1.25}>
                    {product.fields.map((field, index) => (
                        <ProductFieldRenderer key={`${product.productId}-field-${index}`} field={field} index={index} />
                    ))}
                </Stack>
            )}

            <Box
                sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    px: 1,
                    py: 1,
                    backgroundColor: 'background.paper',
                    borderTop: 1,
                    borderColor: 'divider',
                    display: { xs: 'block', md: 'none' },
                    zIndex: (theme) => theme.zIndex.appBar,
                }}
            >
                <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" color="error.main" fontWeight="bold">
                            {formatPrice(selectedVariant?.price)}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton
                                onClick={() => handleSetQuantity(cartQuantity - 1)}
                                disabled={!canDecreaseQuantity}
                                sx={{ border: 1, borderColor: 'divider', width: 36, height: 36 }}
                            >
                                <RemoveIcon />
                            </IconButton>
                            <Typography variant="subtitle1" sx={{ minWidth: 24, textAlign: 'center' }}>{cartQuantity}</Typography>
                            <IconButton
                                onClick={() => handleSetQuantity(cartQuantity + 1)}
                                disabled={!canIncreaseQuantity}
                                sx={{ border: 1, borderColor: 'divider', width: 36, height: 36 }}
                            >
                                <AddIcon />
                            </IconButton>
                        </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={primaryCartButtonIcon}
                            onClick={handlePrimaryCartButtonClick}
                            disabled={primaryCartButtonDisabled}
                            sx={{ minHeight: 50, flex: 1 }}
                        >
                            {primaryCartButtonLabel}
                        </Button>
                        <Button
                            variant="contained"
                            color="info"
                            size="large"
                            startIcon={<ShoppingCartCheckoutRoundedIcon />}
                            onClick={handleBuyNow}
                            disabled={stockCount <= 0 || !selectedVariant}
                            sx={{ minHeight: 50, flex: 1 }}
                        >
                            Buy now
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Container>
    );
}

