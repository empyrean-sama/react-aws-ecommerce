import React from 'react';
import { useSearchParams } from 'react-router';
import {
    Box,
    Checkbox,
    CircularProgress,
    Container,
    ListItemText,
    MenuItem,
    Paper,
    Slider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import ProductService from '../../../service/ProductService';
import ProductCard from '../Home/ProductCard';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import IProductRecord from '../../../interface/product/IProductRecord';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';

interface IResultProduct {
    product: IProductRecord;
    variants: IProductVariantRecord[];
}

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
const CLEAR_TAGS_VALUE = '__CLEAR_TAGS__';

function getDefaultPrice(variants: IProductVariantRecord[], product: IProductRecord): number {
    const defaultVariant = variants.find((item) => item.variantId === product.defaultVariantId) || variants[0];
    return defaultVariant?.price ?? Number.MAX_SAFE_INTEGER;
}

export default function Results() {
    const [searchParams] = useSearchParams();
    const productService = ProductService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [label, setLabel] = React.useState<string>('Results');
    const [items, setItems] = React.useState<IResultProduct[]>([]);
    const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
    const [sortBy, setSortBy] = React.useState<SortOption>('name-asc');
    const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 0]);
    const [averageReviewScoreByProductId, setAverageReviewScoreByProductId] = React.useState<Record<string, number>>({});
    const [collectionNameById, setCollectionNameById] = React.useState<Record<string, string>>({});

    const source = searchParams.get('source');
    const collectionId = searchParams.get('collectionId');
    const searchQuery = searchParams.get('query');
    const productIdsParam = searchParams.get('productIds');

    React.useEffect(() => {
        let isMounted = true;

        (async function loadResults() {
            try {
                setIsLoading(true);

                let products: IProductRecord[] = [];
                let computedLabel = 'Results';
                let nextCollectionNameById: Record<string, string> = {};

                if (source === 'featured') {
                    computedLabel = 'Featured Products';
                    products = (await productService.getFeaturedProducts()) ?? [];
                    const collections = await productService.listCollections();
                    for (const collection of collections ?? []) {
                        nextCollectionNameById[collection.collectionId] = collection.name;
                    }
                } else if (collectionId) {
                    const [collection, collectionProducts] = await Promise.all([
                        productService.getCollection(collectionId),
                        productService.getProductsByCollectionId(collectionId),
                    ]);
                    computedLabel = collection?.name || 'Collection Results';
                    products = collectionProducts ?? [];
                    if (collection) {
                        nextCollectionNameById[collection.collectionId] = collection.name;
                    }
                } else if (source === 'search') {
                    const queryText = searchQuery?.trim() ?? '';
                    computedLabel = queryText.length > 0 ? `Search Results for "${queryText}"` : 'Search Results';

                    const productIds = Array.from(new Set(
                        (productIdsParam ?? '')
                            .split(',')
                            .map((id) => id.trim())
                            .filter(Boolean)
                    ));

                    const resolvedProducts = await Promise.all(productIds.map((productId) => productService.getProductById(productId)));
                    products = resolvedProducts.filter((product): product is IProductRecord => Boolean(product));

                    const collections = await productService.listCollections();
                    for (const collection of collections ?? []) {
                        nextCollectionNameById[collection.collectionId] = collection.name;
                    }
                } else {
                    const collections = await productService.listCollections();
                    for (const collection of collections ?? []) {
                        nextCollectionNameById[collection.collectionId] = collection.name;
                    }
                    const allProductsBatches = await Promise.all((collections ?? []).map((collection) => productService.getProductsByCollectionId(collection.collectionId)));
                    products = allProductsBatches.flatMap((batch) => batch ?? []);
                    computedLabel = 'All Products';
                }
            
                const variantsByProduct = await Promise.all(products.map(async (product) => {
                    const variants = await productService.getVariantsByProductId(product.productId);
                    return { product, variants: variants ?? [] };
                }));

                const averageScores = await productService.getAverageReviewScoresByProductIds(products.map((product) => product.productId));
                const averageScoreMap: Record<string, number> = {};
                for (const [productId, score] of Object.entries(averageScores)) {
                    averageScoreMap[productId] = score.averageScore;
                }

                if (!isMounted) {
                    return;
                }

                setLabel(computedLabel);
                setItems(variantsByProduct);
                setAverageReviewScoreByProductId(averageScoreMap);
                setCollectionNameById(nextCollectionNameById);
            } catch (error) {
                if (isMounted) {
                    console.error('Failed to load results page', error);
                    showMessage('Unable to load results right now', ESnackbarMsgVariant.error);
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
    }, [source, collectionId, searchQuery, productIdsParam]);

    const availableTags = React.useMemo(() => {
        const tags = new Set<string>();
        for (const item of items) {
            for (const tag of item.product.tags ?? []) {
                if (tag?.trim()) {
                    tags.add(tag.trim());
                }
            }
        }
        return Array.from(tags).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [items]);

    const priceBounds = React.useMemo<[number, number]>(() => {
        const prices = items
            .map((item) => getDefaultPrice(item.variants, item.product) / 100)
            .filter((price) => Number.isFinite(price) && price < Number.MAX_SAFE_INTEGER);

        if (prices.length === 0) {
            return [0, 0];
        }

        return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
    }, [items]);

    React.useEffect(() => {
        setPriceRange(priceBounds);
    }, [priceBounds[0], priceBounds[1]]);

    const filteredItems = React.useMemo(() => {
        const [minSelectedPrice, maxSelectedPrice] = priceRange;

        const filtered = items.filter((item) => {
            const priceInRupees = getDefaultPrice(item.variants, item.product) / 100;
            const matchesTag = selectedTags.length === 0 || selectedTags.some((tag) => (item.product.tags ?? []).includes(tag));
            const matchesMinPrice = priceInRupees >= minSelectedPrice;
            const matchesMaxPrice = priceInRupees <= maxSelectedPrice;
            return matchesTag && matchesMinPrice && matchesMaxPrice;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'name-asc') {
                return a.product.name.localeCompare(b.product.name, undefined, { sensitivity: 'base' });
            }
            if (sortBy === 'name-desc') {
                return b.product.name.localeCompare(a.product.name, undefined, { sensitivity: 'base' });
            }

            const aPrice = getDefaultPrice(a.variants, a.product);
            const bPrice = getDefaultPrice(b.variants, b.product);
            if (sortBy === 'price-asc') {
                return aPrice - bPrice;
            }
            return bPrice - aPrice;
        });
    }, [items, selectedTags, priceRange, sortBy]);

    if (isLoading) {
        return (
            <Box sx={{ width: '100%', minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Stack spacing={0.5}>
                <Typography variant="h2">{label}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {filteredItems.length} product{filteredItems.length === 1 ? '' : 's'}
                </Typography>
            </Stack>

            <Box sx={{ p: { xs: 1, md: 2 }, backgroundColor: 'background.paper', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 2, rowGap: 2 }}>
                    <Box sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { xs: 120, md: 220 }, maxWidth: { md: 320 } }}>
                        <TextField
                            select
                            label="Sort"
                            size="small"
                            variant="filled"
                            InputProps={{ disableUnderline: true }}
                            fullWidth
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as SortOption)}
                        >
                            <MenuItem value="name-asc">Name (A-Z)</MenuItem>
                            <MenuItem value="name-desc">Name (Z-A)</MenuItem>
                            <MenuItem value="price-asc">Price (Low to High)</MenuItem>
                            <MenuItem value="price-desc">Price (High to Low)</MenuItem>
                        </TextField>
                    </Box>
                    <Box sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { xs: 120, md: 220 }, maxWidth: { md: 320 } }}>
                        <TextField
                            select
                            label="Tag"
                            size="small"
                            variant="filled"
                            InputProps={{ disableUnderline: true }}
                            fullWidth
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => {
                                    const tags = selected as string[];
                                    return tags.length > 0 ? tags.join(', ') : 'All tags';
                                }
                            }}
                            value={selectedTags}
                            onChange={(event) => {
                                const value = event.target.value;
                                const nextTags = typeof value === 'string' ? value.split(',') : value;
                                if (nextTags.includes(CLEAR_TAGS_VALUE)) {
                                    setSelectedTags([]);
                                    return;
                                }
                                setSelectedTags(nextTags);
                            }}
                        >
                            <MenuItem value={CLEAR_TAGS_VALUE} disabled={selectedTags.length === 0}>
                                Clear tags
                            </MenuItem>
                            {availableTags.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    <ListItemText primary={tag} />
                                    <Checkbox size="small" checked={selectedTags.includes(tag)} />
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 280px' }, minWidth: 0 }}>
                        <Stack spacing={0.25} sx={{ px: { xs: 0.5, md: 1 } }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Price range: ₹{priceRange[0]} - ₹{priceRange[1]}
                            </Typography>
                            <Slider
                                value={priceRange}
                                onChange={(_, value) => setPriceRange(value as [number, number])}
                                valueLabelDisplay="auto"
                                min={priceBounds[0]}
                                max={priceBounds[1]}
                                step={1}
                                disableSwap
                            />
                        </Stack>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' }, alignItems: 'stretch' }}>
                {filteredItems.map((item) => (
                    <ProductCard
                        key={item.product.productId}
                        productRecord={item.product}
                        productVariantRecord={item.variants}
                        rating={averageReviewScoreByProductId[item.product.productId]}
                        collectionName={item.product.collectionId ? collectionNameById[item.product.collectionId] : undefined}
                    />
                ))}
            </Box>

            {filteredItems.length === 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        No products match your current filters.
                    </Typography>
                </Paper>
            )}
        </Container>
    );
}
