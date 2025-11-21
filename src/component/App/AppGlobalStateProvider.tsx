import React, { createContext } from "react";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";

export const appGlobalStateContext = createContext<IAppGlobalStateContextAPI | null>(null);
export default function AppGlobalStateProvider({ children }: { children: React.ReactNode }) {
    return (
        <appGlobalStateContext.Provider value={{}}>
            {children}
        </appGlobalStateContext.Provider>
    )
}