import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router';

import Home from "../pages/Home/Home";
import PageEnclosure from '../pages/PageEnclosure';
import NotFound from "../pages/Error/NotFound";

import Account from '../pages/User/Account';
import Login from '../pages/User/Login';
import SignUp from '../pages/User/SignUp';

export default function AppLayout() {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route path="/" element={<PageEnclosure />}>
            <Route index element={<Home />} />
            <Route path="account" element={<Account />}>
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<SignUp />} />
            </Route>
            <Route path="*" element={<NotFound />} />
        </Route>
    ))

    return (
        <RouterProvider router={router} />
    )
}