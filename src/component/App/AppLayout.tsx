import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, useLoaderData } from 'react-router';
import { Box, CircularProgress } from '@mui/material';

import Home from "../pages/Home/Home";
import PageEnclosure from '../pages/PageEnclosure';
import NotFound from "../pages/Error/NotFound";

import AccountOutlet from '../pages/User/AccountOutlet';
import Account from '../pages/User/Account';
import Login from '../pages/User/Login';
import SignUp from '../pages/User/SignUp';
import VerifyUsername from '../pages/User/VerifyUsername';
import ForgotPassword from '../pages/User/ForgotPassword';
import ForgotPasswordVerify from '../pages/User/ForgotPasswordVerify';
import CustomizeProfile from '../pages/User/CustomizeProfile';
import AdminConsole from "../pages/Admin/AdminConsole";
import AuthService from "../../service/AuthService";
import CatalogPage from '../pages/Admin/Catalog/CatalogPage';
import PagePicker from '../pages/Admin/PagePicker';

type AdminLoaderResult = { allowed: boolean };

async function adminLoader(): Promise<AdminLoaderResult> {
    try {
        const auth = AuthService.getInstance();
        const isAdmin = await auth.isCurrentUserAdmin();
        return { allowed: isAdmin };
    } catch {
        return { allowed: false };
    }
}

/**
 * React Guard for Admin Route
 * @returns 404 Not Found if user is not admin, otherwise AdminConsole
 */
function AdminRoute() {
    const data = useLoaderData() as AdminLoaderResult | undefined;
    if (!data?.allowed) {
        return <NotFound />;
    }
    return <AdminConsole />;
}

export default function AppLayout() {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route path="/" element={<PageEnclosure />} hydrateFallbackElement={<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><CircularProgress /></Box>}>
            <Route index element={<Home />} />
            <Route path="admin" element={<AdminRoute />} loader={adminLoader}>
                <Route index element={<PagePicker />} />
                <Route path="catalog" element={<CatalogPage />} />
            </Route>
            <Route path="account" element={<AccountOutlet />}>
                <Route index element={<Account />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<SignUp />} />
                <Route path="verify-username" element={<VerifyUsername />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="forgot-password/verify" element={<ForgotPasswordVerify />} />
                <Route path="profile" element={<CustomizeProfile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
        </Route>
    ))

    return (
        <RouterProvider router={router} />
    )
}