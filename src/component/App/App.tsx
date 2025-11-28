import React from 'react';

import AppThemeProvider from './AppThemeProvider';
import AppLayout from './AppLayout';
import AppGlobalStateProvider from './AppGlobalStateProvider';
import SnackbarProviderComponent from './snackbar/SnackbarProviderComponent';

export default function App() {
    return (
        <AppThemeProvider>
            <SnackbarProviderComponent>
                <AppGlobalStateProvider>
                    <AppLayout />
                </AppGlobalStateProvider>
            </SnackbarProviderComponent>
        </AppThemeProvider>
    );
}