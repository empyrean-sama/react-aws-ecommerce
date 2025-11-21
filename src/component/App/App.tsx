import React from 'react';

import AppThemeProvider from './AppThemeProvider';
import AppLayout from './AppLayout';
import AppGlobalStateProvider from './AppGlobalStateProvider';

export default function App() {
    return (
        <AppThemeProvider>
            <AppGlobalStateProvider>
                <AppLayout />
            </AppGlobalStateProvider>
        </AppThemeProvider>
    );
}