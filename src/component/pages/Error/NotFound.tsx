import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router";

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <Container 
            maxWidth="sm"
            sx={{
                px: { xs: 2, sm: 3 },
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: { xs: "60vh", sm: "70vh" },
                    textAlign: "center",
                    gap: { xs: 1.5, sm: 2 },
                    py: { xs: 4, sm: 0 },
                }}
            >
                <Typography
                    variant="h1"
                    sx={{ fontSize: { xs: "3rem", sm: "5rem", md: "6rem" } }}
                >
                    404
                </Typography>
                <Typography
                    variant="h5"
                    sx={{
                        fontSize: { xs: "1.25rem", sm: "1.5rem" },
                        color: "text.secondary",
                        mb: { xs: 1, sm: 2 },
                        fontWeight: 500,
                    }}
                >
                    Page Not Found
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        color: "text.secondary",
                        mb: { xs: 2, sm: 3 },
                        maxWidth: { xs: "280px", sm: "400px" },
                        px: { xs: 1, sm: 0 },
                    }}
                >
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate("/")}
                    sx={{
                        px: { xs: 3, sm: 4 },
                        py: { xs: 1.25, sm: 1.5 },
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                >
                    Go to Home
                </Button>
            </Box>
        </Container>
    );
}