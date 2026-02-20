import React, { createContext, useEffect } from "react";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import { useSnackbar } from "notistack";
import ESnackbarMsgVariant from "../../enum/ESnackbarMsgVariant";
import IUserDetails from "../../interface/IUserDetails";
import AuthService from "../../service/AuthService";
import ICollectionRecord from "../../interface/product/ICollectionRecord";
import ProductService from "../../service/ProductService";
import ICartEntry from "../../interface/product/ICartEntry";
import IProductRecord from "../../interface/product/IProductRecord";
import IProductVariantRecord from "../../interface/product/IProductVariantRecord";
import IAppGlobalCartState from "../../interface/IAppGlobalCartState";

export const appGlobalStateContext = createContext<IAppGlobalStateContextAPI | null>(null);

export default function AppGlobalStateProvider({ children }: { children: React.ReactNode }) {
    
    // Providers
    const { enqueueSnackbar } = useSnackbar();
    const authService = AuthService.getInstance()
    const productService = ProductService.getInstance();
    const [loginDetails, setLoginDetails] = React.useState<IUserDetails | null>(null);
    const [favouriteCollections, setFavouriteCollections] = React.useState<ICollectionRecord[]>([]);     
    const lastAdjustedCartSignature = React.useRef<string>('');
    const [cartState, setCartState] = React.useState<IAppGlobalCartState>({cartEntryRecord: null, productIdToProductRecordMap: {}, productIdToVariantsRecordMap: {}});
    
    // Effects
    useEffect(() => {
        // On mount, check if user is logged in
        (async () => {
            try {
                const userDetails = await authService.getCurrentUser();
                setLoginDetails(userDetails);
            } catch (error) {}
        })();

        // Fetch favourite collections
        refreshFavouriteCollections();

        // Fetch cart
        refreshCart();
    }, []);

    useEffect(() => {
        // Whenever login details change, refresh cart to ensure it is in sync with the current user
       refreshCart();
    }, [loginDetails?.userId]);

    // Global API implementations
    function getLoggedInDetails(): IUserDetails | null {
        return loginDetails;
    }
    function setLoggedInDetails(userDetails: IUserDetails | null) {
        setLoginDetails(userDetails);
    }

    async function refreshLoggedInDetails() {
        try {
            const userDetails = await authService.getCurrentUser(true);
            setLoginDetails(userDetails);
        } catch (error) {
            console.error("Failed to refresh user details", error);
        }
    }

    async function logout() {
        try {
            await authService.signOut();
        } catch (error) {
            console.error("Error during sign out:", error);
        }
        finally {
            setLoginDetails(null);
            refreshCart();
        }
    }

    function showMessage(msg: string, variant: ESnackbarMsgVariant = ESnackbarMsgVariant.info, autoHideDuration: number | null = 3000) {
        enqueueSnackbar(msg, { variant, autoHideDuration, persist: autoHideDuration === null });
    }

    async function refreshFavouriteCollections() {
        try {
            const collections = await productService.getFavouriteCollections();
            if (collections) {
                setFavouriteCollections(collections);
            }
        } catch (error) {
            console.error("Failed to fetch favourite collections", error);
        }
    }

    async function refreshCart() {
        try {
            const cartRecord = await authService.getCart();
            const tempProductIdToProductRecordMap = {} as Record<string, IProductRecord>;
            const tempProductIdToVariantsRecordMap = {} as Record<string, IProductVariantRecord[]>;

            const productIds = Array.from(new Set((cartRecord?.products || []).map((item) => item.productId)));
            const hydrationResults = await Promise.all(productIds.map(async (productId) => {
                const [productRecord, variants] = await Promise.all([
                    productService.getProductById(productId),
                    productService.getVariantsByProductId(productId),
                ]);
                return { productId, productRecord, variants };
            }));

            for (const result of hydrationResults) {
                const { productId, productRecord, variants } = result;
                if (productRecord) {
                    tempProductIdToProductRecordMap[productId] = productRecord;
                }
                if (variants) {
                    tempProductIdToVariantsRecordMap[productId] = variants;
                }
            }

            setCartState({cartEntryRecord: cartRecord, productIdToProductRecordMap: tempProductIdToProductRecordMap, productIdToVariantsRecordMap: tempProductIdToVariantsRecordMap});
            if (cartRecord.cartAdjusted) {
                const adjustedSignature = JSON.stringify((cartRecord.products || [])
                    .map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }))
                    .sort((a, b) => {
                        const keyA = `${a.productId}:${a.variantId}`;
                        const keyB = `${b.productId}:${b.variantId}`;
                        return keyA.localeCompare(keyB);
                    }));

                if (lastAdjustedCartSignature.current !== adjustedSignature) {
                    lastAdjustedCartSignature.current = adjustedSignature;
                    showMessage("Some cart quantities were adjusted to match current stock or per-order limits.", ESnackbarMsgVariant.warning);
                }
            }
        } catch (error) {
            console.error("Failed to fetch cart", error);
        }
    }

    async function setCartItems(cartEntry: ICartEntry) {
        try {
            await authService.setCart(cartEntry);
            await refreshCart();
        } catch (error) {
            console.error("Failed to set cart", error);
        }
    }

    async function updateCartItems(cartEntry: ICartEntry) {
        try {
            await authService.updateCart(cartEntry);
            await refreshCart();
        } catch (error) {
            console.error("Failed to update cart", error);
        }
    }

    const cartItemCount = cartState.cartEntryRecord?.products?.reduce((total, item) => total + (item.quantity || 0), 0) ?? 0;

    return (
        <appGlobalStateContext.Provider value={{ authService, showMessage, getLoggedInDetails, setLoggedInDetails, refreshLoggedInDetails, logout, favouriteCollections, refreshFavouriteCollections, cartState, cartItemCount, refreshCart, setCart: setCartItems, updateCart: updateCartItems }}>
            {children}
        </appGlobalStateContext.Provider>
    );
}