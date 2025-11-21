import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router';

import Home from "../pages/Home/Home";
import PageEnclosure from '../pages/PageEnclosure';
import NotFound from "../pages/Error/NotFound";

export default function AppLayout() {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route path="/" element={<PageEnclosure />}>
            <Route index element={<Home />} />
            <Route path="*" element={<NotFound />} />
        </Route>
    ))

    return (
        <RouterProvider router={router} />
    )
}