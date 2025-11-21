import React from "react";
import { IconButton, Badge, SxProps, Theme } from "@mui/material";
import ShoppingCartSharpIcon from '@mui/icons-material/ShoppingCartSharp';

export interface ShoppingCartButtonProps {
    itemCount: number;
    sx?: SxProps<Theme>;
}

export default function ShoppingCartButton({ itemCount, sx }: ShoppingCartButtonProps) {
    return (
        <Badge badgeContent={itemCount} color="info" overlap="circular" sx={sx}>
            <IconButton color="inherit">
                <ShoppingCartSharpIcon />
            </IconButton>
        </Badge>
    );
}