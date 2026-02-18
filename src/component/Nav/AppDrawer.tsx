import React, { useContext, useEffect, useState } from "react";
import SearchBar from "../ui/SearchBar";
import { Box, Divider, List, ListItem, ListItemButton, ListItemText, useTheme } from "@mui/material";
import Constants from "../../Constants";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import AuthService from "../../service/AuthService";

export interface AppDrawerProps {
    isDrawerOpen: boolean;
    setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * The AppDrawer component is responsible for rendering the application's drawer.
 * Shown only in mobile & tablet viewports.
 * @returns a JSX.Element representing the AppDrawer.
 */
export default function AppDrawer({ isDrawerOpen, setIsDrawerOpen }: AppDrawerProps) {
    const theme = useTheme();
    const navigateTo = useNavigate();
    const { favouriteCollections, getLoggedInDetails, logout } = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const [isAdmin, setIsAdmin] = useState(false);
    const navRef = React.useRef<HTMLElement | null>(null);
    const isLoggedIn = getLoggedInDetails() !== null;

    const handleLogout = async () => {
        await logout();
        setIsDrawerOpen(false);
        navigateTo("/");
    };

    useEffect(() => {
        AuthService.getInstance().isCurrentUserAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    }, []);

    // Must listen for escape key to close drawer
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isDrawerOpen) {
                setIsDrawerOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isDrawerOpen]);

    useEffect(() => {
        const navElement = navRef.current;
        if (!navElement) {
            return;
        }

        if (isDrawerOpen) {
            navElement.removeAttribute('inert');
            return;
        }

        const activeElement = document.activeElement;
        if (activeElement && navElement.contains(activeElement)) {
            (activeElement as HTMLElement).blur();
        }
        navElement.setAttribute('inert', '');
    }, [isDrawerOpen]);

    return (
        <>
            <Box 
                component="nav"
                ref={navRef}
                aria-label="Mobile navigation"
                sx={{
                    position: "fixed",
                    padding: 1, 
                    paddingLeft: 0,
                    paddingBottom: 0,
                    top: 0, 
                    left: 0, 
                    zIndex: 2000, 
                    width: {xs: Constants.DRAWER_WIDTH_MOBILE, sm: Constants.DRAWER_WIDTH_TABLET}, 
                    height: "100dvh",
                    transform: isDrawerOpen ? "translateX(0)" : {xs: `translateX(-${Constants.DRAWER_WIDTH_MOBILE})`, sm: `translateX(-${Constants.DRAWER_WIDTH_TABLET})`},
                    transition: "inherit", 
                    willChange: "transform",
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <SearchBar
                    placeholder="Search products..."
                    sx={{ backgroundColor: theme.palette.background.default, marginLeft: 1, width: {xs: `calc(${Constants.DRAWER_WIDTH_MOBILE} - ${theme.spacing(1)}px)`, sm: `calc(${Constants.DRAWER_WIDTH_TABLET} - ${theme.spacing(1)}px)`} }}
                    onSearchTriggered={() => setIsDrawerOpen(false)}
                />
                <Box sx={{backgroundColor: theme.palette.background.paper, flexGrow: 1}}>
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => { navigateTo("/"); setIsDrawerOpen(false); }}>
                                <ListItemText primary="HOME" />
                            </ListItemButton>
                        </ListItem>
                        {[...favouriteCollections].sort((a,b) => b.favouriteStrength - a.favouriteStrength).map((collection) => (
                            <ListItem key={collection.collectionId} disablePadding>
                                <ListItemButton onClick={() => { navigateTo(`/collection/${collection.collectionId}`); setIsDrawerOpen(false); }}>
                                    <ListItemText primary={collection.name} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {isAdmin && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => { navigateTo("/admin"); setIsDrawerOpen(false); }}>
                                    <ListItemText primary="ADMIN" primaryTypographyProps={{ color: '#9c27b0', fontWeight: 'bold' }} />
                                </ListItemButton>
                            </ListItem>
                        )}
                        <Divider />
                        {!isLoggedIn && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => { navigateTo("/account/login", { state: { from: window.location.pathname } }); setIsDrawerOpen(false); }}>
                                    <ListItemText primary="Login" />
                                </ListItemButton>
                            </ListItem>
                        )}
                        {!isLoggedIn && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => { navigateTo("/account/signup"); setIsDrawerOpen(false); }}>
                                    <ListItemText primary="Register" />
                                </ListItemButton>
                            </ListItem>
                        )}
                        {isLoggedIn && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => { navigateTo("/account"); setIsDrawerOpen(false); }}>
                                    <ListItemText primary="Account" />
                                </ListItemButton>
                            </ListItem>
                        )}
                        {isLoggedIn && (
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => { void handleLogout(); }}>
                                    <ListItemText primary="Logout" />
                                </ListItemButton>
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Box>
        
            <Box 
                onClick={() => setIsDrawerOpen(false)}
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0)', //transparent background
                    opacity: isDrawerOpen ? 1 : 0,
                    pointerEvents: isDrawerOpen ? 'auto' : 'none',
                    transition: 'opacity 0.3s',
                    zIndex: 1999,
                    display: { lg: 'none' }
                }}
                aria-hidden="true"
            />
        </>
    );
}