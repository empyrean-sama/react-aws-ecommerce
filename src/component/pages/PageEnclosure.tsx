import React, { useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router";

import Nav from "../Nav/Nav";
import SearchBar from "../ui/SearchBar";

export default function PageEnclosure() {
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const drawerWidth: string = "80dvw";

    return (
        <Box component="main" sx={{transition: ".3s transform ease-in-out", overflowX: "hidden", willChange: isDrawerOpen ? "transform" : "auto"}}>
            <Box sx={{position: "fixed", padding: 1, top: 0, left: 0, zIndex: 2000, width: drawerWidth, height: "100dvh", transform: isDrawerOpen ? "translateX(0)" : `translateX(-${drawerWidth})`, transition: "inherit", willChange: "transform"}}>
                <SearchBar placeholder="Search products..." />
            </Box>
            <Box sx={{transition: "inherit", paddingLeft: isDrawerOpen? 1: undefined, minHeight: "100dvh", display: "flex", flexDirection: "column", transform: isDrawerOpen? `translateX(${drawerWidth})`: undefined }}>
                <Nav setIsDrawerOpen={setIsDrawerOpen} isDrawerOpen={isDrawerOpen} />
                <Box component="section" sx={{flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center"}}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}