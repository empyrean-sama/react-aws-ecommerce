import React, { createContext, useEffect } from "react";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import { useSnackbar } from "notistack";
import ESnackbarMsgVariant from "../../enum/ESnackbarMsgVariant";
import IUserDetails from "../../interface/IUserDetails";
import AuthService from "../../service/AuthService";
import ICollectionRecord from "../../interface/product/ICollectionRecord";
import ProductService from "../../service/ProductService";

export const appGlobalStateContext = createContext<IAppGlobalStateContextAPI | null>(null);

export default function AppGlobalStateProvider({ children }: { children: React.ReactNode }) {
    
    // Providers
    const { enqueueSnackbar } = useSnackbar();
    const authService = AuthService.getInstance()
    const productService = ProductService.getInstance();
    const [loginDetails, setLoginDetails] = React.useState<IUserDetails | null>(null);
    const [favouriteCollections, setFavouriteCollections] = React.useState<ICollectionRecord[]>([]);
    
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
    }, []);

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

    return (
        <appGlobalStateContext.Provider value={{ authService, showMessage, getLoggedInDetails, setLoggedInDetails, refreshLoggedInDetails, logout, favouriteCollections, refreshFavouriteCollections }}>
            {children}
        </appGlobalStateContext.Provider>
    );
}