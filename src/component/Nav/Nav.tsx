import React from "react";
import { useNavigate } from "react-router";

import { AppBar, Box, IconButton, Typography, Toolbar, Tabs, Tab, useTheme, Container } from "@mui/material";
import SearchBar from "../ui/SearchBar";

import ShoppingCartButton from "./ShoppingCartButton";
import AccountButtons from "./AccountButtons";

import MenuIcon from '@mui/icons-material/Menu';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';

export interface NavProps {
    setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isDrawerOpen: boolean;
}

export default function Nav({ setIsDrawerOpen, isDrawerOpen }: NavProps) {
    const theme = useTheme();
    const navigateTo = useNavigate();
    const [value, setValue] = React.useState(0); //todo: remove

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <AppBar position="sticky">
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ display: { xs: 'block', lg: 'none' }, lineHeight: 0 }} onClick={() => setIsDrawerOpen((prevValue) => !prevValue)}>{isDrawerOpen ? <CloseSharpIcon /> : <MenuIcon />}</IconButton>
                <Typography variant="h1" component="h1" sx={{ flexGrow: {xs: 0, lg: 1}, textAlign: { xs: 'center', lg: 'left' }, cursor: 'pointer' }} onClick={() => navigateTo("/")}>Srividhya-Foods</Typography>
                <Box sx={{ mx: {xs: 0, lg: 2}, display: 'flex', alignItems: 'center' }}>
                    <SearchBar placeholder="Search products..." sx={{ width: '450px', display: { xs: 'none', lg: 'block' } }} />
                    <ShoppingCartButton itemCount={3} sx={{ ml: {xs: 0, lg: 1} }} />
                    <AccountButtons sx={{ ml: 2, display: { xs: 'none', md: 'block' } }} />
                </Box>
            </Toolbar>
            <Box sx={{ borderTop: `1px solid ${theme.palette.grey[300]}` }}></Box>
            <Toolbar variant="dense" sx={{ display: { xs: 'none', lg: 'flex' } }}>
                <Container maxWidth="xl">
                    <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                        <Tab label="HOME" />
                        <Tab label="Sweets" />
                        <Tab label="Hots" />
                        <Tab label="Vadiyalu" />
                        <Tab label="Godavari Specials" />
                        <Tab label="Podulu" />
                        <Tab label="Pickles" />
                        <Tab label="Gift Packs" />
                    </Tabs>
                </Container>
            </Toolbar>
        </AppBar>
    );
}