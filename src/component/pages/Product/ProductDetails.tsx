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
import StarRoundedIcon from '@mui/icons-material/StarRounded';

import ProductService from '../../../service/ProductService';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import IProductRecord from '../../../interface/product/IProductRecord';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import IReviewRecord from '../../../interface/product/IReviewRecord';
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

function formatReviewDate(timestamp: number): string {
    if (!Number.isFinite(timestamp)) {
        return 'Unknown date';
    }
    return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
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

    const { showMessage, cartState, setCart, getLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [product, setProduct] = React.useState<IProductRecord | null>(null);
    const [variants, setVariants] = React.useState<IProductVariantRecord[]>([]);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string>('');
    const [selectedImageIndex, setSelectedImageIndex] = React.useState<number>(0);
    const [reviews, setReviews] = React.useState<IReviewRecord[]>([]);
    const [averageReviewScore, setAverageReviewScore] = React.useState<number | null>(null);
    const [canSubmitReview, setCanSubmitReview] = React.useState<boolean>(false);
    const [reviewEligibilityReason, setReviewEligibilityReason] = React.useState<string>('');
    const [isSubmittingReview, setIsSubmittingReview] = React.useState<boolean>(false);
    const [reviewTitle, setReviewTitle] = React.useState<string>('');
    const [reviewText, setReviewText] = React.useState<string>('');
    const [reviewStarRating, setReviewStarRating] = React.useState<number>(5);
    const [editingReviewId, setEditingReviewId] = React.useState<string | null>(null);
    const [editReviewTitle, setEditReviewTitle] = React.useState<string>('');
    const [editReviewText, setEditReviewText] = React.useState<string>('');
    const [editReviewStarRating, setEditReviewStarRating] = React.useState<number>(5);
    const [isUpdatingReview, setIsUpdatingReview] = React.useState<boolean>(false);
    const [deletingReviewId, setDeletingReviewId] = React.useState<string | null>(null);
    const loggedInUserId = getLoggedInDetails()?.userId;

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
                const fetchedReviews = fetchedProduct
                    ? await productService.getReviewsByProductId(fetchedProduct.productId)
                    : [];
                const fetchedAverageReview = fetchedProduct
                    ? await productService.getAverageReviewScoreByProductId(fetchedProduct.productId)
                    : null;
                const eligibility = fetchedProduct && loggedInUserId
                    ? await productService.getReviewSubmissionEligibility(fetchedProduct.productId).catch(() => ({ canSubmit: false, reason: '' }))
                    : { canSubmit: false, reason: '' };

                if (!isMounted) {
                    return;
                }

                setProduct(fetchedProduct);
                const resolvedVariants = fetchedVariants ?? [];
                setVariants(resolvedVariants);
                setReviews(fetchedReviews ?? []);
                setAverageReviewScore(fetchedAverageReview?.averageScore ?? null);
                setCanSubmitReview(eligibility.canSubmit);
                setReviewEligibilityReason(eligibility.reason ?? '');

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
    }, [collectionSlug, productSlug, loggedInUserId]);

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

        if (Number.isFinite(stockCount) && newQuantity > stockCount) {
            showMessage(`Only ${stockCount} left in stock.`, ESnackbarMsgVariant.warning);
            return;
        }

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

        if (Number.isFinite(stockCount) && nextQuantity > stockCount) {
            showMessage(`Only ${stockCount} left in stock.`, ESnackbarMsgVariant.warning);
            return;
        }

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
        navigateTo(`/checkout?mode=single&productId=${encodeURIComponent(product!.productId)}&variantId=${encodeURIComponent(selectedVariant!.variantId)}&quantity=1`);
    }

    async function handleSubmitReview() {
        if (!product || isSubmittingReview) {
            return;
        }

        const loggedInUser = getLoggedInDetails();
        if (!loggedInUser) {
            showMessage('Please sign in to leave a review.', ESnackbarMsgVariant.warning);
            return;
        }

        if (!reviewTitle.trim() || !reviewText.trim()) {
            showMessage('Please provide both review title and text.', ESnackbarMsgVariant.warning);
            return;
        }

        if (!Number.isInteger(reviewStarRating) || reviewStarRating < 1 || reviewStarRating > 5) {
            showMessage('Star rating must be between 1 and 5.', ESnackbarMsgVariant.warning);
            return;
        }

        try {
            setIsSubmittingReview(true);

            const createdReview = await productService.createReview({
                productId: product.productId,
                title: reviewTitle.trim(),
                text: reviewText.trim(),
                starRating: reviewStarRating,
            });

            setReviews((prev) => [createdReview, ...prev]);
            setReviewTitle('');
            setReviewText('');
            setReviewStarRating(5);
            showMessage('Review submitted successfully.', ESnackbarMsgVariant.success);
        } catch (error) {
            console.error('Failed to submit review', error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : 'Unable to submit review right now.';
            showMessage(errorMessage, ESnackbarMsgVariant.error);
        } finally {
            setIsSubmittingReview(false);
        }
    }

    function handleStartEditReview(review: IReviewRecord) {
        setEditingReviewId(review.reviewId);
        setEditReviewTitle(review.title);
        setEditReviewText(review.text);
        setEditReviewStarRating(review.starRating);
    }

    function handleCancelEditReview() {
        setEditingReviewId(null);
        setEditReviewTitle('');
        setEditReviewText('');
        setEditReviewStarRating(5);
    }

    async function handleSaveEditedReview(review: IReviewRecord) {
        if (!product || !editingReviewId || isUpdatingReview) {
            return;
        }

        if (!editReviewTitle.trim() || !editReviewText.trim()) {
            showMessage('Please provide both review title and text.', ESnackbarMsgVariant.warning);
            return;
        }

        if (!Number.isInteger(editReviewStarRating) || editReviewStarRating < 1 || editReviewStarRating > 5) {
            showMessage('Star rating must be between 1 and 5.', ESnackbarMsgVariant.warning);
            return;
        }

        try {
            setIsUpdatingReview(true);

            const updatedReview = await productService.updateReview(review.reviewId, {
                productId: product.productId,
                title: editReviewTitle.trim(),
                text: editReviewText.trim(),
                starRating: editReviewStarRating,
            });

            setReviews((prev) => prev.map((item) => item.reviewId === updatedReview.reviewId ? updatedReview : item));
            handleCancelEditReview();
            showMessage('Review updated successfully.', ESnackbarMsgVariant.success);
        } catch (error) {
            console.error('Failed to update review', error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : 'Unable to update review right now.';
            showMessage(errorMessage, ESnackbarMsgVariant.error);
        } finally {
            setIsUpdatingReview(false);
        }
    }

    async function handleDeleteReview(review: IReviewRecord) {
        if (deletingReviewId) {
            return;
        }

        try {
            setDeletingReviewId(review.reviewId);
            await productService.deleteReview(review.reviewId);
            setReviews((prev) => prev.filter((item) => item.reviewId !== review.reviewId));
            if (editingReviewId === review.reviewId) {
                handleCancelEditReview();
            }
            showMessage('Review deleted successfully.', ESnackbarMsgVariant.success);
        } catch (error) {
            console.error('Failed to delete review', error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : 'Unable to delete review right now.';
            showMessage(errorMessage, ESnackbarMsgVariant.error);
        } finally {
            setDeletingReviewId(null);
        }
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
                            {typeof averageReviewScore === 'number' && Number.isFinite(averageReviewScore) && (
                                <Chip
                                    label={`★ ${averageReviewScore.toFixed(1)}`}
                                    color="warning"
                                    variant="outlined"
                                />
                            )}
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

            <Paper sx={{ p: 2.25, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <StarRoundedIcon color="warning" />
                    <Typography variant="h6">Reviews</Typography>
                </Stack>

                {canSubmitReview && (
                    <Box sx={{ p: 1.75, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Stack spacing={1.25}>
                            <Typography variant="subtitle1" fontWeight={700}>Write a review</Typography>
                            <TextField
                                label="Title"
                                size="small"
                                variant="filled"
                                InputProps={{ disableUnderline: true }}
                                value={reviewTitle}
                                onChange={(event) => setReviewTitle(event.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Review"
                                variant="filled"
                                InputProps={{ disableUnderline: true }}
                                value={reviewText}
                                onChange={(event) => setReviewText(event.target.value)}
                                multiline
                                minRows={3}
                                fullWidth
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                <TextField
                                    select
                                    label="Rating"
                                    size="small"
                                    variant="filled"
                                    InputProps={{ disableUnderline: true }}
                                    value={reviewStarRating}
                                    onChange={(event) => setReviewStarRating(Number(event.target.value))}
                                    sx={{ width: { xs: '100%', sm: 140 } }}
                                >
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <MenuItem key={`rating-${rating}`} value={rating}>{rating}</MenuItem>
                                    ))}
                                </TextField>
                                <Button
                                    variant="contained"
                                    onClick={handleSubmitReview}
                                    disabled={isSubmittingReview || !product}
                                    sx={{ minHeight: 40 }}
                                >
                                    {isSubmittingReview ? 'Submitting...' : 'Submit review'}
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                )}

                {!canSubmitReview && reviewEligibilityReason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {reviewEligibilityReason}
                    </Typography>
                )}

                {reviews.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No reviews yet.
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        {reviews.map((review) => (
                            <Paper key={review.reviewId} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'background.default' }}>
                                <Stack spacing={0.5}>
                                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                                        <Stack spacing={0.25}>
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>{review.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {review.reviewerName} • {formatReviewDate(review.createdAt)}
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: 'action.hover' }}>
                                            <StarRoundedIcon fontSize="small" color="warning" />
                                            <Typography variant="caption" fontWeight={700}>{review.starRating}/5</Typography>
                                        </Stack>
                                    </Stack>

                                    {editingReviewId === review.reviewId ? (
                                        <Stack spacing={1}>
                                            <TextField
                                                label="Title"
                                                size="small"
                                                variant="filled"
                                                InputProps={{ disableUnderline: true }}
                                                value={editReviewTitle}
                                                onChange={(event) => setEditReviewTitle(event.target.value)}
                                                fullWidth
                                            />
                                            <TextField
                                                label="Review"
                                                variant="filled"
                                                InputProps={{ disableUnderline: true }}
                                                value={editReviewText}
                                                onChange={(event) => setEditReviewText(event.target.value)}
                                                multiline
                                                minRows={3}
                                                fullWidth
                                            />
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                                <TextField
                                                    select
                                                    label="Rating"
                                                    size="small"
                                                    variant="filled"
                                                    InputProps={{ disableUnderline: true }}
                                                    value={editReviewStarRating}
                                                    onChange={(event) => setEditReviewStarRating(Number(event.target.value))}
                                                    sx={{ width: { xs: '100%', sm: 120 } }}
                                                >
                                                    {[1, 2, 3, 4, 5].map((rating) => (
                                                        <MenuItem key={`edit-rating-${rating}`} value={rating}>{rating}</MenuItem>
                                                    ))}
                                                </TextField>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => handleSaveEditedReview(review)}
                                                        disabled={isUpdatingReview}
                                                    >
                                                        {isUpdatingReview ? 'Saving...' : 'Save'}
                                                    </Button>
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        onClick={handleCancelEditReview}
                                                        disabled={isUpdatingReview}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.45 }}>
                                            {review.text}
                                        </Typography>
                                    )}

                                    {loggedInUserId && review.userId === loggedInUserId && editingReviewId !== review.reviewId && (
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => handleStartEditReview(review)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="text"
                                                onClick={() => handleDeleteReview(review)}
                                                disabled={deletingReviewId === review.reviewId}
                                            >
                                                {deletingReviewId === review.reviewId ? 'Deleting...' : 'Delete'}
                                            </Button>
                                        </Stack>
                                    )}
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Paper>

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

