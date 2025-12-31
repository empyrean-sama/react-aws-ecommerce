import React from "react";
import { Paper } from "@mui/material";

export interface PanelShellProps {
    flexBasis?: string;
}

export default function PanelShell(props: React.PropsWithChildren<PanelShellProps>) {
    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 0,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                overflowY: "hidden",
                flex: `1 1 ${props.flexBasis || 'auto'}`,
            }}
        >
            {props.children}
        </Paper>
    )
}