import React from "react";
import { Paper } from "@mui/material";

export interface PanelShellProps {
    grow?: boolean;
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
                m: 1,
                flexGrow: props.grow ? 1 : undefined,
            }}
        >
            {props.children}
        </Paper>
    )
}