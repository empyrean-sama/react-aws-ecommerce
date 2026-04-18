import React from 'react';
import { Box, CircularProgress, Fade, Typography } from '@mui/material';

interface GlobalLoadingScreenProps {
    isLoading: boolean;
}

export default function GlobalLoadingScreen({ isLoading }: GlobalLoadingScreenProps) {
    return (
        <Fade in={isLoading} timeout={{ enter: 300, exit: 400 }} unmountOnExit>
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    gap: 3,
                }}
            >
                <CircularProgress size={44} thickness={4} color="primary" />
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        letterSpacing: 1.5,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                    }}
                >
                    Loading
                </Typography>
            </Box>
        </Fade>
    );
}
