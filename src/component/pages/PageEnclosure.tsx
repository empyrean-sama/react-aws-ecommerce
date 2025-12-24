import React, { useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router";

import Nav from "../Nav/Nav";
import AppDrawer from "../Nav/AppDrawer";
import Constants from "../../Constants";

export default function PageEnclosure() {
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    return (
        <Box component="main" sx={{transition: ".3s transform ease-in-out", overflowX: "hidden", willChange: isDrawerOpen ? "transform" : "auto"}}>
            <AppDrawer isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen}>
                
            </AppDrawer>
            <Box sx={{
                transition: "inherit", 
                paddingLeft: isDrawerOpen? 1: undefined, 
                overflowY: "hidden",
                minHeight: "100dvh",
                maxHeight: "100dvh",
                display: "flex", 
                flexDirection: "column", 
                transform: isDrawerOpen? {xs: `translateX(${Constants.DRAWER_WIDTH_MOBILE})`, sm: `translateX(${Constants.DRAWER_WIDTH_TABLET})`} : undefined }}
            >
                <Nav setIsDrawerOpen={setIsDrawerOpen} isDrawerOpen={isDrawerOpen} />
                <Box component="section" sx={{flexGrow: 1, display: "flex", overflowY: "auto"}}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}