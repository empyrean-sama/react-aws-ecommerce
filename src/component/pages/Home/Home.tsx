import React from "react";
import { Container, Typography } from "@mui/material";
// import ImageViewer from "../Admin/ImageViewer";

export default function Home() {
    return (
        <Container maxWidth="xl" sx={{ paddingX: { xs: 0, sm: 3 }, marginY: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginTop: 16 }}>
                <Typography variant="h2" component="h2" textAlign="center" sx={{ mb: 3 }}>Welcome to the Home Page</Typography>
                <Typography variant="body1" component="p" textAlign="center" sx={{ mb: 3 }}>
                    Under Construction 🚧
                </Typography>
            </div>
        </Container>
    )
}