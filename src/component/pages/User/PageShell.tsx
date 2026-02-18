import React from "react";
import { Container, Card, CardContent, Typography, Box, IconButton } from "@mui/material";
import { useNavigate } from "react-router";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

export interface PageShellProps {
    pageLabel: string;
    showBackButton?: boolean;
    backTo?: string;
}

export default function PageShell({ pageLabel, showBackButton = false, backTo, children }: React.PropsWithChildren<PageShellProps>) {
    
    // Global API
    const navigate = useNavigate();
    
    // Private routines
    function handleOnBack() {
        if (backTo) navigate(backTo, { replace: true });
        else navigate(-1);
    }

    return (
                <Box sx={{flexGrow: 1, display: "flex"}}>
            <Box sx={{display: "flex", flexGrow: 1 }}>
                <Container maxWidth="sm" sx={{ py: 4, px: {xs: 0, sm: 3}, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Card sx={{ overflowY: "auto"}}>
                        <CardContent sx={{ p: { xs: 3, sm: 4 }, position: "relative" }}>
                            {showBackButton && (
                                <IconButton 
                                    aria-label="Go back" 
                                    size="small" 
                                    onClick={handleOnBack}
                                    color="primary"
                                    sx={{position: "absolute", top: 0, left: 32}}
                                >
                                    <KeyboardBackspaceIcon />
                                </IconButton>
                            )}
                            <Typography variant="h1" component="h1" textAlign="center" sx={{ mb: 3 }}>{pageLabel}</Typography>
                            {children}
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        </Box>
    );
}
