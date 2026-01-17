import React from "react";
import { IconButton, Badge, SxProps, Theme } from "@mui/material";
import ShoppingCartSharpIcon from '@mui/icons-material/ShoppingCartSharp';

export interface ShoppingCartButtonProps {
    itemCount: number;
    sx?: SxProps<Theme>;
    onClick?: () => void;
}

export default function ShoppingCartButton({ itemCount, sx, onClick }: ShoppingCartButtonProps) {
    return (
        <Badge badgeContent={itemCount} color="info" overlap="circular" sx={sx}>
            <IconButton color="inherit" aria-label="Open cart" onClick={onClick}>
                <ShoppingCartSharpIcon />
            </IconButton>
        </Badge>
    );
}