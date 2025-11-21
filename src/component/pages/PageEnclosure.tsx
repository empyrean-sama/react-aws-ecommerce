import React, { useState } from "react";
import { Box, useTheme } from "@mui/material";
import { Outlet } from "react-router";

import Nav from "../Nav/Nav";
import SearchBar from "../ui/SearchBar";
import AppDrawer from "../ui/AppDrawer";

export default function PageEnclosure() {
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const drawerWidth: string = "80dvw";

    return (
        <Box component="main" sx={{transition: ".3s transform ease-in-out", overflowX: "hidden", willChange: isDrawerOpen ? "transform" : "auto"}}>
            <AppDrawer isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen}>
                
            </AppDrawer>
            <Box sx={{transition: "inherit", paddingLeft: isDrawerOpen? 1: undefined, minHeight: "100dvh", display: "flex", flexDirection: "column", transform: isDrawerOpen? `translateX(${drawerWidth})`: undefined }}>
                <Nav setIsDrawerOpen={setIsDrawerOpen} isDrawerOpen={isDrawerOpen} />
                <Box component="section" sx={{flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center"}}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}