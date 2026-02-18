import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { AppBar, Box, IconButton, Typography, Toolbar, Tabs, Tab, useTheme, Container } from "@mui/material";
import SearchBar from "../ui/SearchBar";

import ShoppingCartButton from "./ShoppingCartButton";
import AccountButtons from "./AccountButtons";

import MenuIcon from '@mui/icons-material/Menu';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import { appGlobalStateContext } from "../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import AuthService from "../../service/AuthService";

export interface NavProps {
    setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isDrawerOpen: boolean;
}

export default function Nav({ setIsDrawerOpen, isDrawerOpen }: NavProps) {
    const theme = useTheme();
    const navigateTo = useNavigate();
    const location = useLocation();
    const { favouriteCollections, cartItemCount } = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        AuthService.getInstance().isCurrentUserAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    }, []);

    const selectedTabValue = React.useMemo(() => {
        const path = location.pathname || "/";

        if (path === "/") {
            return "home";
        }

        if (path.startsWith("/collection/")) {
            const collectionId = decodeURIComponent(path.replace("/collection/", "").split("/")[0] || "");
            const isKnownCollection = favouriteCollections.some((collection) => collection.collectionId === collectionId);
            return isKnownCollection ? `collection:${collectionId}` : false;
        }

        if (path.startsWith("/admin")) {
            return "admin";
        }

        return false;
    }, [location.pathname, favouriteCollections]);

    return (
        <AppBar position="sticky">
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ display: { xs: 'block', lg: 'none' }, lineHeight: 0 }} onClick={() => setIsDrawerOpen((prevValue) => !prevValue)}>{isDrawerOpen ? <CloseSharpIcon /> : <MenuIcon />}</IconButton>
                <Typography variant="h1" component="h1" sx={{ flexGrow: {xs: 0, lg: 1}, textAlign: { xs: 'center', lg: 'left' }, cursor: 'pointer' }} onClick={() => navigateTo("/")}>Srividhya-Foods</Typography>
                <Box sx={{ mx: {xs: 0, lg: 2}, display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                        <SearchBar placeholder="Search products..." sx={{ width: '450px' }} />
                    </Box>
                    <ShoppingCartButton itemCount={cartItemCount} sx={{ ml: {xs: 0, lg: 1} }} onClick={() => navigateTo("/cart")} />
                    <AccountButtons sx={{ ml: 2, display: { xs: 'none', md: 'block' } }} />
                </Box>
            </Toolbar>
            <Box sx={{ borderTop: `1px solid ${theme.palette.grey[300]}` }}></Box>
            <Toolbar variant="dense" sx={{ display: { xs: 'none', lg: 'flex' } }}>
                <Container maxWidth="xl">
                    <Tabs value={selectedTabValue} aria-label="main-navigation">
                        <Tab value="home" label="HOME" onClick={() => navigateTo("/")} />
                        {favouriteCollections.map((collection) => (
                            <Tab key={collection.collectionId} value={`collection:${collection.collectionId}`} label={collection.name} onClick={() => navigateTo(`/collection/${collection.collectionId}`)} />
                        ))}
                        {isAdmin && <Tab value="admin" label="ADMIN" onClick={() => navigateTo("/admin")} sx={{ color: '#9c27b0', fontWeight: 'bold' }} />}
                    </Tabs>
                </Container>
            </Toolbar>
        </AppBar>
    );
}