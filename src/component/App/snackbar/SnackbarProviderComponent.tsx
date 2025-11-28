import React from "react";
import { SnackbarProvider } from 'notistack';
import MsgInfo from "./MsgInfo";

export default function SnackbarProviderComponent(props: React.PropsWithChildren<{}>) {
    return (
        <SnackbarProvider 
            maxSnack={3}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            Components={{ 
                info: MsgInfo
            }}
        >
            {props.children}
        </SnackbarProvider>
    );
}