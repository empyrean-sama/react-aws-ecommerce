import React from 'react';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLocation, useNavigate } from 'react-router';

import NotFound from '../Error/NotFound';

type OrderPlacedState = {
    fromCheckoutSuccess?: boolean;
    orderId?: string;
    itemCount?: number;
    totalAmount?: number;
};

function formatPriceFromPaise(amount: number): string {
    return `₹${(Number(amount || 0) / 100).toFixed(2)}`;
}

export default function OrderPlaced() {
    const navigateTo = useNavigate();
    const location = useLocation();

    const state = (location.state ?? {}) as OrderPlacedState;
    if (!state.fromCheckoutSuccess) {
        return <NotFound />;
    }

    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 3, md: 4 } }}>
                <Stack spacing={2.5} alignItems="center" textAlign="center">
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'success.light',
                            color: 'success.main',
                        }}
                    >
                        <CheckCircleIcon sx={{ fontSize: 40 }} />
                    </Box>

                    <Typography variant="h2" component="h1">
                        Thanks for placing your order!
                    </Typography>

                    <Typography variant="body1" color="text.secondary">
                        Your payment was successful and we have started processing your order.
                    </Typography>

                    {state.orderId ? (
                        <Typography variant="body2" color="text.secondary">
                            Order ID: {state.orderId}
                        </Typography>
                    ) : null}

                    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 460, p: 2, borderRadius: 2 }}>
                        <Stack spacing={1.25}>
                            <Typography variant="h5" component="h2" textAlign="left">
                                Order Summary
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Items</Typography>
                                <Typography variant="body2" fontWeight={600}>{Math.max(0, Number(state.itemCount || 0))}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Order Total</Typography>
                                <Typography variant="body2" fontWeight={700}>{formatPriceFromPaise(Number(state.totalAmount || 0))}</Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                        <Button variant="contained" onClick={() => navigateTo('/account')}>
                            View My Orders
                        </Button>
                        <Button variant="outlined" onClick={() => navigateTo('/')}>
                            Continue Shopping
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Container>
    );
}
