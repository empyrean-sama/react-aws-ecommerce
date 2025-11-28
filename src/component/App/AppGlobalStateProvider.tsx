import React, { createContext } from "react";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import { useSnackbar } from "notistack";
import ESnackbarMsgVariant from "../../enum/ESnackbarMsgVariant";

export const appGlobalStateContext = createContext<IAppGlobalStateContextAPI | null>(null);

export default function AppGlobalStateProvider({ children }: { children: React.ReactNode }) {
    const { enqueueSnackbar } = useSnackbar();
    
    function showMessage(msg: string, variant: ESnackbarMsgVariant = ESnackbarMsgVariant.info, autoHideDuration: number | null = 3000) {
        enqueueSnackbar(msg, { variant, autoHideDuration, persist: autoHideDuration === null });
    }

    return (
        <appGlobalStateContext.Provider value={{ showMessage }}>
            {children}
        </appGlobalStateContext.Provider>
    );
}