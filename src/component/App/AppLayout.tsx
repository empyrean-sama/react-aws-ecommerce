import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, RouterProvider, useLoaderData } from 'react-router';
import { Box, CircularProgress } from '@mui/material';

import PageEnclosure from '../pages/PageEnclosure';
import SiteFooter from '../ui/SiteFooter';
import AuthService from "../../service/AuthService";

// Helper to wrap Lazy components in Suspense
const Loadable = (Component: React.LazyExoticComponent<any>) => (props: any) => (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', width: "100dvw" }}><CircularProgress /></Box>}>
        <Component {...props} />
    </Suspense>
);

// Lazy Load Pages
const Home = Loadable(React.lazy(() => import("../pages/Home/Home")));
const ProductDetails = Loadable(React.lazy(() => import('../pages/Product/ProductDetails')));
const NotFound = Loadable(React.lazy(() => import("../pages/Error/NotFound")));
const Cart = Loadable(React.lazy(() => import("../pages/Cart/Cart")));

const AccountOutlet = Loadable(React.lazy(() => import('../pages/User/AccountOutlet')));
const Account = Loadable(React.lazy(() => import('../pages/User/Account')));
const Login = Loadable(React.lazy(() => import('../pages/User/Login')));
const SignUp = Loadable(React.lazy(() => import('../pages/User/SignUp')));
const VerifyUsername = Loadable(React.lazy(() => import('../pages/User/VerifyUsername')));
const ForgotPassword = Loadable(React.lazy(() => import('../pages/User/ForgotPassword')));
const ForgotPasswordVerify = Loadable(React.lazy(() => import('../pages/User/ForgotPasswordVerify')));
const CustomizeProfile = Loadable(React.lazy(() => import('../pages/User/CustomizeProfile')));

const AdminConsole = Loadable(React.lazy(() => import("../pages/Admin/AdminConsole")));
const CatalogPage = Loadable(React.lazy(() => import('../pages/Admin/Catalog/CatalogPage')));
const PagePicker = Loadable(React.lazy(() => import('../pages/Admin/PagePicker')));
const PromotionManagement = Loadable(React.lazy(() => import('../pages/Admin/PromotionManagement/PromotionManagement')));

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

function NonAdminLayout() {
    return (
        <Box sx={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </Box>
            <SiteFooter />
        </Box>
    );
}

export default function AppLayout() {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route path="/" element={<PageEnclosure />} hydrateFallbackElement={<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', width: "100vw"}}><CircularProgress /></Box>}>
            <Route element={<NonAdminLayout />}>
                <Route index element={<Home />} />
                <Route path="product/:productId" element={<ProductDetails />} />
                <Route path="cart" element={<Cart />} />
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

            <Route path="admin" element={<AdminRoute />} loader={adminLoader}>
                <Route index element={<PagePicker />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="promotions" element={<PromotionManagement />} />
            </Route>
        </Route>
    ))

    return (
        <RouterProvider router={router} />
    )
}