import React, {PropsWithChildren, useEffect} from "react";
import Box from "@mui/material/Box/Box";
import SearchBar from "../ui/SearchBar";
import { useTheme } from "@mui/material";
import Constants from "../../Constants";

export interface AppDrawerProps {
    isDrawerOpen: boolean;
    setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * The AppDrawer component is responsible for rendering the application's drawer.
 * Shown only in mobile & tablet viewports.
 * @returns a JSX.Element representing the AppDrawer.
 */
export default function AppDrawer({ isDrawerOpen, setIsDrawerOpen, children }: PropsWithChildren<AppDrawerProps>) {
    const theme = useTheme();

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
    
    return (
        <>
            <Box 
                component="nav"
                aria-label="Mobile navigation"
                aria-hidden={!isDrawerOpen}
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
                <SearchBar placeholder="Search products..." sx={{ backgroundColor: theme.palette.background.default, marginLeft: 1, width: {xs: `calc(${Constants.DRAWER_WIDTH_MOBILE} - ${theme.spacing(1)}px)`, sm: `calc(${Constants.DRAWER_WIDTH_TABLET} - ${theme.spacing(1)}px)`} }}/>
                <Box sx={{backgroundColor: theme.palette.background.paper, flexGrow: 1}}>
                    {children}
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