import React, { createContext, useEffect } from "react";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import { useSnackbar } from "notistack";
import ESnackbarMsgVariant from "../../enum/ESnackbarMsgVariant";
import IUserDetails from "../../interface/IUserDetails";
import AuthService from "../../service/AuthService";

export const appGlobalStateContext = createContext<IAppGlobalStateContextAPI | null>(null);

export default function AppGlobalStateProvider({ children }: { children: React.ReactNode }) {
    
    // Providers
    const { enqueueSnackbar } = useSnackbar();
    const authService = AuthService.getInstance()
    const [loginDetails, setLoginDetails] = React.useState<IUserDetails | null>(null);
    
    // Effects
    useEffect(() => {
        // On mount, check if user is logged in
        (async () => {
            try {
                const userDetails = await authService.getCurrentUser();
                setLoginDetails(userDetails);
            } catch (error) {}
        })();
    }, []);

    // Global API implementations
    function getLoggedInDetails(): IUserDetails | null {
        return loginDetails;
    }
    function setLoggedInDetails(userDetails: IUserDetails | null) {
        setLoginDetails(userDetails);
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

    return (
        <appGlobalStateContext.Provider value={{ showMessage, getLoggedInDetails, setLoggedInDetails, logout }}>
            {children}
        </appGlobalStateContext.Provider>
    );
}