import React from "react";
import { Box, Container } from "@mui/material";
import { Outlet } from "react-router";

export default function PageEnclosure() {
    return (
        <Box component="main">
            <Box component="nav">Navbar</Box>
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Outlet />
            </Container>
        </Box>
    );
}