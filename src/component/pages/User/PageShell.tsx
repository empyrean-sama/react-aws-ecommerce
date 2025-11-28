import React, { useState } from "react";
import { Container, Card, CardContent, Typography, Box, Button, TextField } from "@mui/material";
import { Link } from "react-router";

export interface PageShellProps {
    pageLabel: string;
}

export default function PageShell({ pageLabel, children }: React.PropsWithChildren<PageShellProps>) {
    return (
        <Container maxWidth="sm" sx={{ py: 4, px: {xs: 0, sm: 3} }}>
            <Card>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    <Typography variant="h1" component="h1" textAlign="center" sx={{ mb: 3 }}>{pageLabel}</Typography>
                    {children}
                </CardContent>
            </Card>
        </Container>
    );
}
