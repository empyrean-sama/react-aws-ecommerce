import React from "react";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider"; 
import ProductService from "../../../service/ProductService";
import UtilityService from "../../../service/UtilityService";
import Constants from "../../../Constants";

import { Container, CircularProgress, Box, useTheme, useMediaQuery, Skeleton, Stack, SxProps, Theme } from "@mui/material";
import ProductCard from "./ProductCard";
import ProductRack from "./ProductRack";
import ImageCarousel, { ICarouselItem } from "./ImageCarousel";

import ICollectionRecord from "../../../interface/product/ICollectionRecord";
import IProductRecord from "../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

const RACK_PRODUCT_LIMIT = 9;
const CAROUSEL_ASPECT_RATIO = '23/8';
const LAZY_RACK_OBSERVER_OPTIONS: IntersectionObserverInit = {
    root: null,
    rootMargin: '300px 0px',
    threshold: 0.1,
};

interface IHomeRackProduct {
    productRecord: IProductRecord;
    variantRecords: IProductVariantRecord[];
}

interface IHomeDataState {
    featuredProducts: IHomeRackProduct[];
    collections: ICollectionRecord[];
}

function sortRackProducts(a: IProductRecord, b: IProductRecord): number {
    if (a.favourite !== b.favourite) {
        return a.favourite === 'true' ? -1 : 1;
    }
    if (a.favourite === 'true' && b.favourite === 'true' && a.favouriteStrength !== b.favouriteStrength) {
        return b.favouriteStrength - a.favouriteStrength;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function selectRackProducts(
    favouriteProducts: IProductRecord[] | null,
    allProducts: IProductRecord[] | null,
    limit: number = RACK_PRODUCT_LIMIT
): IProductRecord[] {
    const selected = new Map<string, IProductRecord>();
    const favouritesSorted = [...(favouriteProducts ?? [])].sort(sortRackProducts);
    const allSorted = [...(allProducts ?? [])].sort(sortRackProducts);

    for (const product of favouritesSorted) {
        selected.set(product.productId, product);
        if (selected.size >= limit) {
            return Array.from(selected.values()).slice(0, limit);
        }
    }

    for (const product of allSorted) {
        if (!selected.has(product.productId)) {
            selected.set(product.productId, product);
        }
        if (selected.size >= limit) {
            break;
        }
    }

    return Array.from(selected.values()).sort(sortRackProducts).slice(0, limit);
}

function sortCollectionsForHome(a: ICollectionRecord, b: ICollectionRecord): number {
    if (a.favourite !== b.favourite) {
        return a.favourite === 'true' ? -1 : 1;
    }
    if (a.favourite === 'true' && b.favourite === 'true' && a.favouriteStrength !== b.favouriteStrength) {
        return b.favouriteStrength - a.favouriteStrength;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function mapBannerItems(banners: any[] | null | undefined): ICarouselItem[] {
    return (banners || [])
        .map((banner, index) => ({
            id: banner?.id?.toString?.() ?? `promotion-${index + 1}`,
            imageUrl: typeof banner?.image === 'string' ? banner.image : '',
            altText: typeof banner?.altText === 'string' ? banner.altText : `Promotion ${index + 1}`
        }))
        .filter((item) => !!item.imageUrl);
}

async function buildRackProducts(
    products: IProductRecord[],
    productService: ProductService
): Promise<IHomeRackProduct[]> {
    const variantsEntries = await Promise.all(products.map(async (product) => {
        const variants = await productService.getVariantsByProductId(product.productId);
        return [product, variants ?? []] as const;
    }));

    return variantsEntries.map(([productRecord, variantRecords]) => ({
        productRecord,
        variantRecords,
    }));
}

async function loadHomeData(productService: ProductService): Promise<IHomeDataState> {
    const [featured, fetchedCollections] = await Promise.all([
        productService.getFeaturedProducts(),
        productService.listCollections(),
    ]);

    const featuredFavourites = (featured ?? []).filter((product) => product.favourite === 'true');
    const selectedFeatured = selectRackProducts(featuredFavourites, featured, RACK_PRODUCT_LIMIT);
    const featuredProducts = await buildRackProducts(selectedFeatured, productService);
    const collections = [...(fetchedCollections ?? [])].sort(sortCollectionsForHome);

    return { featuredProducts, collections };
}

export default function Home() {
    
    // State variables
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [featuredProducts, setFeaturedProducts] = React.useState<IHomeRackProduct[]>([]);
    const [collections, setCollections] = React.useState<ICollectionRecord[]>([]);
    const [carouselItems, setCarouselItems] = React.useState<ICarouselItem[]>([]);
    const [isCarouselLoading, setIsCarouselLoading] = React.useState<boolean>(true);
    
    // Global API & Services
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const productService = ProductService.getInstance();
    const utilityService = UtilityService.getInstance();
    const theme = useTheme();

    // Computed Values
    const isNotMobile = useMediaQuery(theme.breakpoints.up('md')); 

    // Effects
    React.useEffect(() => {
        let isMounted = true;

        (async function loadInitialHomeData() {
            try {
                setIsLoading(true);
                const data = await loadHomeData(productService);
                if (isMounted) {
                    setFeaturedProducts(data.featuredProducts);
                    setCollections(data.collections);
                }
            } catch (error) {
                if (isMounted) {
                    console.error("Error loading home page product data:", error);
                    showMessage('An unknown error occurred while loading home products', ESnackbarMsgVariant.error);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => { isMounted = false };
    }, []);

    React.useEffect(() => {
        let isMounted = true;

        (async function loadCarouselItems() {
            try {
                setIsCarouselLoading(true);
                const banners = await utilityService.getList(Constants.PROMOTION_BANNER_LIST_KEY);
                if (!isMounted) {
                    return;
                }

                setCarouselItems(mapBannerItems(banners));
            } catch (error) {
                if (isMounted) {
                    console.error("Error fetching promotion banners:", error);
                    showMessage('Unable to load promotion banners right now', ESnackbarMsgVariant.warning);
                    setCarouselItems([]);
                }
            } finally {
                if (isMounted) {
                    setIsCarouselLoading(false);
                }
            }
        })();

        return () => { isMounted = false; };
    }, []);

    return (
        <Box sx={{display: "flex" , flexDirection: "column", width: "100%"}}>
            <CarouselSlot
                isLoading={isCarouselLoading}
                items={carouselItems}
                sx={{ paddingX: { xs: 0, md: 2 } }}
            />

            <Container maxWidth="xl" sx={{ marginY: isNotMobile ? 6 : 4 }}>
                <LoadingEnclosure isLoading={isLoading}>
                    <Box sx={{ display: "flex", flexDirection: "column", rowGap: 6, width: '100%' }}>
                        <ProductRack label="Featured Products">
                            {featuredProducts.map(({ productRecord, variantRecords }) => (
                                <ProductCard
                                    key={productRecord.productId}
                                    productRecord={productRecord}
                                    productVariantRecord={variantRecords}
                                    currency="INR"
                                />
                            ))}
                        </ProductRack>
                        {collections.map((collection) => (
                            <LazyCollectionRack
                                key={collection.collectionId}
                                collection={collection}
                                showMessage={showMessage}
                            />
                        ))}
                    </Box>
                </LoadingEnclosure>
            </Container>
        </Box>
    );
}

function CarouselSlot(props: { isLoading: boolean; items: ICarouselItem[]; sx?: SxProps<Theme> }) {
    if (props.isLoading) {
        return <CarouselLoadingSpinner sx={props.sx} />;
    }
    return <ImageCarousel items={props.items} sx={props.sx} />;
}

function CarouselLoadingSpinner(props: { sx?: SxProps<Theme> }) {
    return (
        <Box sx={{ width: '100%', ...props.sx }}>
            <Box
                sx={{
                    width: '100%',
                    aspectRatio: CAROUSEL_ASPECT_RATIO,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <CircularProgress />
            </Box>
        </Box>
    );
}

interface ILazyCollectionRackProps {
    collection: ICollectionRecord;
    showMessage: IAppGlobalStateContextAPI['showMessage'];
}

function LazyCollectionRack(props: ILazyCollectionRackProps) {
    const { collection, showMessage } = props;
    const productService = ProductService.getInstance();
    const rackRef = React.useRef<HTMLDivElement | null>(null);

    const [isVisible, setIsVisible] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [hasLoaded, setHasLoaded] = React.useState<boolean>(false);
    const [products, setProducts] = React.useState<IHomeRackProduct[]>([]);

    React.useEffect(() => {
        const element = rackRef.current;
        if (!element || isVisible) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setIsVisible(true);
            }
        }, LAZY_RACK_OBSERVER_OPTIONS);

        observer.observe(element);
        return () => observer.disconnect();
    }, [isVisible]);

    React.useEffect(() => {
        if (!isVisible || hasLoaded) {
            return;
        }

        let isMounted = true;
        (async function() {
            try {
                setIsLoading(true);
                const [favouriteProducts, allProducts] = await Promise.all([
                    productService.getFavouriteProductsByCollectionId(collection.collectionId),
                    productService.getProductsByCollectionId(collection.collectionId),
                ]);

                const selectedProducts = selectRackProducts(favouriteProducts, allProducts, RACK_PRODUCT_LIMIT);
                const rackProducts = await buildRackProducts(selectedProducts, productService);

                if (!isMounted) {
                    return;
                }

                setProducts(rackProducts);
            } catch (error) {
                if (isMounted) {
                    console.error(`Error loading collection rack ${collection.collectionId}:`, error);
                    showMessage(`Unable to load ${collection.name} right now`, ESnackbarMsgVariant.warning);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                    setHasLoaded(true);
                }
            }
        })();

        return () => { isMounted = false; };
    }, [isVisible, hasLoaded, collection.collectionId, collection.name, showMessage]);

    return (
        <Box ref={rackRef} sx={{ width: '100%' }}>
            {!hasLoaded || isLoading ? (
                <RackLoadingPlaceholder />
            ) : products.length > 0 ? (
                <ProductRack label={collection.name}>
                    {products.map(({ productRecord, variantRecords }) => (
                        <ProductCard 
                            key={productRecord.productId}
                            productRecord={productRecord}
                            productVariantRecord={variantRecords}
                            currency="INR"
                        />
                    ))}
                </ProductRack>
            ) : null}
        </Box>
    );
}

function RackLoadingPlaceholder() {
    return (
        <Box sx={{ display: "flex", justifyContent: "center", columnGap: 2, rowGap: 2, flexWrap: 'wrap' }}>
            <Box
                sx={{
                    width: { xs: 175, md: 250 },
                    height: { xs: 260, md: 320 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                <Skeleton variant="rectangular" width="100%" height="100%" />
            </Box>
            {Array.from({ length: RACK_PRODUCT_LIMIT }).map((_, index) => (
                <Box
                    key={`rack-placeholder-card-${index}`}
                    sx={{
                        width: { xs: 175, md: 250 },
                        height: { xs: 260, md: 320 },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    <Skeleton variant="rectangular" width="100%" height="65%" />
                    <Skeleton variant="text" width="80%" height={28} sx={{ mx: 1 }} />
                    <Skeleton variant="text" width="45%" height={24} sx={{ mx: 1 }} />
                    <Box sx={{ display: 'flex', gap: 1, px: 1, pb: 1 }}>
                        <Skeleton variant="rectangular" width="50%" height={36} />
                        <Skeleton variant="rectangular" width="50%" height={36} />
                    </Box>
                </Box>
            ))}
        </Box>
    );
}

function LoadingEnclosure(props: { isLoading: boolean; children?: React.ReactNode }) {
    if(props.isLoading) {
        return (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }
    else {
        return (
            <>
                {props.children}
            </>
        );
    }
}