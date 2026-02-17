import React from 'react';
import { Box, Typography } from '@mui/material';

export default function SiteFooter() {
    return (
        <Box
            component="footer"
            sx={{
                width: '100%',
                py: 1.5,
                px: 2,
                backgroundColor: 'common.black',
                color: 'common.white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mt: 2
            }}
        >
            <Typography variant="body2">
                © {new Date().getFullYear()} React AWS Ecommerce
            </Typography>
        </Box>
    );
}
