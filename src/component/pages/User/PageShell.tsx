import React from "react";
import { Container, Card, CardContent, Typography, Box, IconButton } from "@mui/material";
import { motion } from 'framer-motion';
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
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          key={location.pathname}
          style={{flexGrow: 1, display: "flex"}}
        >
            <Box sx={{display: "flex", flexGrow: 1}}>
                <Container maxWidth="sm" sx={{ py: 4, px: {xs: 0, sm: 3}, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Card>
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
        </motion.div>
    );
}
