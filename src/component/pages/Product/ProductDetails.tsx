import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
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

function isExceedingMaxQuantityPerOrder(maximumInOrder: number | undefined, quantity: number): boolean {
    if (typeof maximumInOrder === 'number' && Number.isFinite(maximumInOrder)) {
        return quantity > maximumInOrder;
    }
    return true;
}

function ProductFieldRenderer(props: { field: IProductField; index: number }) {
    const { field, index } = props;

    if (field.type === EProductFieldType.section) {
        const section = field as ISectionField;
        return (
            <Paper key={`section-${index}`} sx={{ p: 2 }}>
                <Typography variant="h6">{section.sectionTitle}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                    {section.sectionDescription}
                </Typography>
            </Paper>
        );
    }

    if (field.type === EProductFieldType.table) {
        const table = field as ITableField;
        return (
            <Paper key={`table-${index}`} sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>{table.tableName}</Typography>
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
            </Paper>
        );
    }

    return null;
}

export default function ProductDetails() {
    const { productId } = useParams();
    const navigateTo = useNavigate();
    const productService = ProductService.getInstance();

    const { showMessage, cartState, setCart } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [product, setProduct] = React.useState<IProductRecord | null>(null);
    const [variants, setVariants] = React.useState<IProductVariantRecord[]>([]);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string>('');
    const [selectedImageIndex, setSelectedImageIndex] = React.useState<number>(0);

    React.useEffect(() => {
        let isMounted = true;

        (async function loadProduct() {
            try {
                setIsLoading(true);

                if (!productId) {
                    if (isMounted) {
                        setProduct(null);
                        setVariants([]);
                    }
                    return;
                }

                const [fetchedProduct, fetchedVariants] = await Promise.all([
                    productService.getProductById(productId),
                    productService.getVariantsByProductId(productId),
                ]);

                if (!isMounted) {
                    return;
                }

                setProduct(fetchedProduct);
                const resolvedVariants = fetchedVariants ?? [];
                setVariants(resolvedVariants);

                if (fetchedProduct) {
                    const defaultVariant = getDefaultVariant(fetchedProduct, resolvedVariants);
                    setSelectedVariantId(defaultVariant?.variantId ?? '');
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
    }, [productId]);

    const selectedVariant = variants.find((variant) => variant.variantId === selectedVariantId)
        || getDefaultVariant(product as IProductRecord, variants)
        || null;

    const stockCount = selectedVariant?.stock ?? 0;
    const stockStatus = getStockStatus(stockCount);
    const maximumInOrder = selectedVariant?.maximumInOrder;

    const cartQuantity = cartState.cartEntryRecord?.products?.find(
        (item) => item.productId === product?.productId && item.variantId === selectedVariant?.variantId
    )?.quantity ?? 0;

    function handleSetQuantity(newQuantity: number) {
        if (!product || !selectedVariant) return;
        if (newQuantity < 0) return;

        if (isExceedingMaxQuantityPerOrder(maximumInOrder, newQuantity)) {
            showMessage(`Maximum quantity per order is ${maximumInOrder}.`, ESnackbarMsgVariant.warning);
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
        if (isExceedingMaxQuantityPerOrder(maximumInOrder, nextQuantity)) {
            showMessage(`Maximum quantity per order is ${maximumInOrder}.`, ESnackbarMsgVariant.warning);
            return;
        }

        handleSetQuantity(nextQuantity);
        showMessage(`Added to cart: ${product?.name}`, ESnackbarMsgVariant.success);
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
        <Container maxWidth="xl" sx={{ py: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Button variant="text" sx={{ width: 'fit-content' }} onClick={() => navigateTo(-1)}>
                Back
            </Button>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box component="img" src={selectedImage} alt={`${product.name} image`} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                    {images.length > 1 && (
                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
                            {images.map((image, index) => (
                                <Box
                                    key={`${product.productId}-image-${index}`}
                                    component="button"
                                    onClick={() => setSelectedImageIndex(index)}
                                    sx={{
                                        border: selectedImageIndex === index ? '2px solid' : '1px solid',
                                        borderColor: selectedImageIndex === index ? 'primary.main' : 'divider',
                                        padding: 0,
                                        background: 'none',
                                        cursor: 'pointer',
                                        width: 72,
                                        height: 72,
                                    }}
                                >
                                    <Box component="img" src={image} alt={`${product.name} thumbnail ${index + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Paper>

                <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h1" component="h1">{product.name}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={stockStatus.statusText} color={stockStatus.statusColor} />
                        {product.favourite === 'true' && <Chip label="Favourite" color="warning" variant="outlined" />}
                        {product.featured === 'true' && <Chip label="Featured" color="info" variant="outlined" />}
                    </Stack>

                    {product.description && (
                        <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                            {product.description}
                        </Typography>
                    )}

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                        <Typography variant="h3" color="error.main">
                            {formatPrice(selectedVariant?.price)}
                        </Typography>
                        {selectedVariant && (
                            <TextField
                                select
                                label="Variant"
                                size="small"
                                value={selectedVariant.variantId}
                                onChange={(event) => setSelectedVariantId(event.target.value)}
                                sx={{ minWidth: 220 }}
                            >
                                {variants.map((variant) => (
                                    <MenuItem key={variant.variantId} value={variant.variantId}>
                                        {variant.name} · {formatPrice(variant.price)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    </Stack>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleSetQuantity(cartQuantity - 1)} disabled={cartQuantity <= 0 || !selectedVariant}>
                            <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="h6" sx={{ minWidth: 24, textAlign: 'center' }}>{cartQuantity}</Typography>
                        <IconButton size="small" onClick={() => handleSetQuantity(cartQuantity + 1)} disabled={stockCount <= 0 || !selectedVariant}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={handleAddToCart} disabled={stockCount <= 0 || !selectedVariant}>
                            Add To Cart
                        </Button>
                        <Button variant="contained" color="info" onClick={handleBuyNow} disabled={stockCount <= 0 || !selectedVariant}>
                            Buy Now
                        </Button>
                    </Stack>
                </Paper>
            </Box>

            {Array.isArray(product.tags) && product.tags.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h5" sx={{ mb: 1 }}>Tags</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {product.tags.map((tag) => (
                            <Chip key={`${product.productId}-tag-${tag}`} label={tag} variant="outlined" />
                        ))}
                    </Stack>
                </Paper>
            )}

            {Array.isArray(product.fields) && product.fields.length > 0 && (
                <Stack spacing={2}>
                    <Typography variant="h4">Product Details</Typography>
                    {product.fields.map((field, index) => (
                        <ProductFieldRenderer key={`${product.productId}-field-${index}`} field={field} index={index} />
                    ))}
                </Stack>
            )}
        </Container>
    );
}
