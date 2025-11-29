import React from "react";
import { Container, Card, CardContent, Typography } from "@mui/material";
import { motion } from 'framer-motion';

export interface PageShellProps {
    pageLabel: string;
}

export default function PageShell({ pageLabel, children }: React.PropsWithChildren<PageShellProps>) {
    return (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          key={location.pathname}
        >
            <Container maxWidth="sm" sx={{ py: 4, px: {xs: 0, sm: 3} }}>
                <Card>
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        <Typography variant="h1" component="h1" textAlign="center" sx={{ mb: 3 }}>{pageLabel}</Typography>
                        {children}
                    </CardContent>
                </Card>
            </Container>
        </motion.div>
    );
}
