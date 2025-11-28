import React from "react";
import { SnackbarProvider } from 'notistack';
import MsgBase from "./MsgBase";

export default function SnackbarProviderComponent(props: React.PropsWithChildren<{}>) {
    return (
        <SnackbarProvider 
            maxSnack={3}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            Components={{ 
                info: MsgBase,
                success: MsgBase,
                warning: MsgBase,
                error: MsgBase,
            }}
        >
            {props.children}
        </SnackbarProvider>
    );
}