import React from "react";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider"; 
import ProductService from "../../../service/ProductService";

import { Container, Typography, Grid, CircularProgress, Box } from "@mui/material";
import ProductCard from "./ProductCard";
import ProductRack from "./ProductRack";

import IProductRecord from "../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";
import { Product } from "aws-cdk-lib/aws-servicecatalog";

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
            <Container 
                maxWidth="xl" 
                sx={{ 
                    paddingX: { xs: 2, sm: 3 }, marginY: 4, 
                    display: "flex", flexDirection: "column", alignItems: "flex-start" 
                }}
            >
                <LoadingEnclosure>
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