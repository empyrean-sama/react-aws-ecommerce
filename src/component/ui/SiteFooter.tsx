import React from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Container, Link, Stack, Typography } from '@mui/material';

export default function SiteFooter() {
    const footerLinks = [
        { label: 'About Us', to: '/about' },
        { label: 'Contact Us', to: '/contact' },
        { label: 'FAQ', to: '/faq' },
    ];

    return (
        <Box
            component="footer"
            sx={{
                width: '100%',
                mt: 4,
                background: theme => `linear-gradient(180deg, ${theme.palette.grey[900]} 0%, ${theme.palette.common.black} 100%)`,
                color: 'common.white',
                borderTop: theme => `1px solid ${theme.palette.grey[800]}`,
            }}
        >
            <Container maxWidth="xl" sx={{ py: { xs: 3, md: 3.5 } }}>
                <Stack spacing={2.5}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={{ xs: 2.5, md: 3 }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                    >
                        <Box sx={{ maxWidth: 420 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Srividhya Foods
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.400' }}>
                                Explore the store, learn more about the business, and find support quickly from any device.
                            </Typography>
                        </Box>

                        <Box sx={{ width: { xs: '100%', md: 'auto' } }}>
                            <Typography variant="overline" sx={{ color: 'grey.500', letterSpacing: 1.2 }}>
                                Quick Links
                            </Typography>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={{ xs: 1, sm: 2.5 }}
                                sx={{ mt: 0.75, flexWrap: 'wrap' }}
                            >
                                {footerLinks.map((link) => (
                                    <Link
                                        key={link.to}
                                        component={RouterLink}
                                        to={link.to}
                                        variant="body2"
                                        underline="none"
                                        sx={{
                                            color: 'grey.200',
                                            fontWeight: 500,
                                            transition: 'color 0.2s ease',
                                            '&:hover': {
                                                color: 'common.white',
                                            },
                                        }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>

                    <Box
                        sx={{
                            pt: 2,
                            borderTop: theme => `1px solid ${theme.palette.grey[800]}`,
                        }}
                    >
                        <Typography variant="body2" sx={{ color: 'grey.500', textAlign: { xs: 'left', md: 'center' } }}>
                            © {new Date().getFullYear()} Srividhya Foods, All rights reserved.
                        </Typography>
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}
