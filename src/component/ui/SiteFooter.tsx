import React from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Link, Typography } from '@mui/material';

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
                gap: 2,
                mt: 2
            }}
        >
            <Typography variant="body2">
                © {new Date().getFullYear()} React AWS Ecommerce
            </Typography>
            <Link
                component={RouterLink}
                to="/about"
                variant="body2"
                underline="hover"
                sx={{ color: 'common.white' }}
            >
                About Us
            </Link>
            <Link
                component={RouterLink}
                to="/faq"
                variant="body2"
                underline="hover"
                sx={{ color: 'common.white' }}
            >
                FAQ
            </Link>
        </Box>
    );
}
