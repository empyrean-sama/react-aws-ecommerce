import React from "react";

import { Container, Typography, Grid, CircularProgress, Box } from "@mui/material";
import ProductCard from "./ProductCard";

import IProductRecord from "../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import ProductService from "../../../service/ProductService";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

export default function Home() {
    const productService = ProductService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [featuredProducts, setFeaturedProducts] = React.useState<IProductRecord[]>([]);
    const [productVariants, setProductVariants] = React.useState<Record<string, IProductVariantRecord[]>>({});
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                setIsLoading(true);
                const products = await productService.getFeaturedProducts();
                if (!isMounted) {
                    return;
                }
                const items = products ?? [];
                setFeaturedProducts(items);

                const variantsEntries = await Promise.all(
                    items.map(async (product) => {
                        const variants = await productService.getVariantsByProductId(product.productId);
                        return [product.productId, variants ?? []] as const;
                    })
                );

                if (!isMounted) {
                    return;
                }
                const variantsMap: Record<string, IProductVariantRecord[]> = {};
                for (const [productId, variants] of variantsEntries) {
                    variantsMap[productId] = variants;
                }
                setProductVariants(variantsMap);
            } catch (error) {
                console.error("Failed to load featured products", error);
                showMessage("Failed to load featured products", ESnackbarMsgVariant.error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <Container maxWidth="xl" sx={{ paddingX: { xs: 2, sm: 3 }, marginY: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Typography variant="h2" component="h1" sx={{ alignSelf: "flex-start", mb: 2 }}>Featured Products</Typography>

            {isLoading && (
                <Box sx={{ py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && featuredProducts.length === 0 && (
                <Typography variant="body1" color="text.secondary">No featured products available.</Typography>
            )}

            {!isLoading && featuredProducts.length > 0 && (
                featuredProducts.map((product) => (
                    <ProductCard
                        productRecord={product}
                        productVariantRecord={productVariants[product.productId] ?? []}
                    />
                ))
            )}
        </Container>
    )
}