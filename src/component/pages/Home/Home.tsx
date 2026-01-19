import React from "react";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider"; 
import ProductService from "../../../service/ProductService";

import { Container, CircularProgress, Box, useTheme, useMediaQuery } from "@mui/material";
import ProductCard from "./ProductCard";
import ProductRack from "./ProductRack";
import ImageCarousel, { ICarouselItem } from "./ImageCarousel";
import placeHolderImageString from "url:./placeholderImage.png";

import IProductRecord from "../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

export interface IHomeContextAPI {
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const homeContext = React.createContext<IHomeContextAPI | null>(null);

export default function Home() {
    
    // State variables
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [featuredProducts, setFeaturedProducts] = React.useState<Array<{productRecord: IProductRecord, variantRecords: IProductVariantRecord[]}>>([]);
    
    // Global API & Services
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const productService = ProductService.getInstance();
    const theme = useTheme();

    // Computed Values
    const isNotMobile = useMediaQuery(theme.breakpoints.up('md')); 
    const testCarouselItems: ICarouselItem[] = [
        { id: "1", imageUrl: placeHolderImageString },
        { id: "2", imageUrl: placeHolderImageString },
        { id: "3", imageUrl: placeHolderImageString },
    ];

    // Effects
    React.useEffect(() => {
        // Fetch featured products on mount
        let isMounted = true;
        (async function() {
            try {
                setIsLoading(true);
                const products = await productService.getFeaturedProducts();
                if(isMounted && products) {
                    const variantsEntries = await Promise.all(products.map(async (product) => {
                        const variants = await productService.getVariantsByProductId(product.productId);
                        return [product, variants ?? []] as const;
                    }));

                    const featuredProductsData: Array<{productRecord: IProductRecord, variantRecords: IProductVariantRecord[]}> = [];
                    for(const entry of variantsEntries) {
                        const [product, variants] = entry;
                        featuredProductsData.push({ productRecord: product, variantRecords: variants });
                    }
                    if(isMounted) {
                        setFeaturedProducts(featuredProductsData);
                    }
                }
            } catch (error) {
                if(isMounted) {
                    console.error("Error fetching featured products:", error);
                    showMessage('An unknown error occurred while fetching featured products', ESnackbarMsgVariant.error);
                }
            } finally {
                if(isMounted) {
                    setIsLoading(false);
                }
            }
        })();
        return () => { isMounted = false };
    }, []);

    return (
        <homeContext.Provider value={{ isLoading, setIsLoading }}>
            <Box sx={{display: "flex" , flexDirection: "column", width: "100%"}}>
                <ImageCarousel items={testCarouselItems} sx={{ marginTop: 2, display: isNotMobile ? 'none' : 'block' }} />
                <Container 
                    maxWidth="xl" 
                    sx={{ 
                        marginTop: isNotMobile ? 4 : 2, 
                        display: "flex", flexDirection: "column", alignItems: "flex-start", 
                        gap: 2
                    }}
                >
                    <LoadingEnclosure>                    
                        <ImageCarousel items={testCarouselItems} sx={{ display: isNotMobile ? 'block' : 'none' }} />
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
                    </LoadingEnclosure>
                </Container>
            </Box>
        </homeContext.Provider>
    );
}

function LoadingEnclosure(props: React.PropsWithChildren<{}>) {
    const { isLoading } = React.useContext(homeContext) as IHomeContextAPI;
    if(isLoading) {
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