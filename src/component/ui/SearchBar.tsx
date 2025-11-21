import React from "react";
import Box from "@mui/material/Box";
import { alpha, InputBase, SxProps, useTheme } from "@mui/material";

import SearchIcon from '@mui/icons-material/Search';
import { Theme } from "@emotion/react";

export interface SearchBarProps {
    placeholder?: string;
    sx?: SxProps<Theme>;
}

export default function SearchBar({ placeholder = "Search…", sx }: SearchBarProps) {
    const theme = useTheme();

    return (
        <Box component="div" sx={{ 
                position: 'relative', 
                backgroundColor: alpha(theme.palette.background.default, .75),
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
                '&:hover': {
                    backgroundColor: alpha(theme.palette.background.default, 1),
                },
                width: '100%',
                ...sx
            }}>
            <Box
                component="div"
                sx= {{
                    padding: theme.spacing(0, 2),
                    height: '100%',
                    position: 'absolute',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
            }}>
                <SearchIcon />
            </Box>
            <InputBase
                sx={{
                    color: 'inherit',
                    width: '100%',
                    padding: theme.spacing(1, 1, 1, 0),
                    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                }}
                placeholder={placeholder}
                inputProps={{ 'aria-label': 'search' }}
            />
        </Box>
    );
}