import React, { useEffect } from "react";
import AuthService from "../../../service/AuthService";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import { Container, Typography, Box, Grid, Tab, Tabs } from "@mui/material";
import OrderCard from "./OrderCard";
import AddressPanel from "./AddressPanel";

export default function Account() {

    // Global API
    const { getLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const authService = AuthService.getInstance();
    const navigateTo = useNavigate();

    // State
    const [tabLocation, setTabLocation] = React.useState<"orders" | "addresses">("orders");

    // Effects
    useEffect(() => {
        // Redirect to login if not logged in
        (async () => {
            const userDetails = await authService.getCurrentUser();
            if(!userDetails) {
                navigateTo("/account/login", {replace: true});
            }
        })();
    },[getLoggedInDetails()]);

    return (
        <Container maxWidth="xl" sx={{ paddingX: { xs: 0, sm: 3 }, marginY: 4, display: "flex", flexDirection: "column" }}>
            <Typography variant="h1" component="h1" sx={{textAlign: { xs: "center", sm: "left" }, mb: 3}} gutterBottom>Hi {getLoggedInDetails()?.givenName} {getLoggedInDetails()?.familyName},</Typography>
            
            <Tabs
                value={tabLocation}
                onChange={(e, newValue) => setTabLocation(newValue)}
                variant="fullWidth"
                sx={{ display: {xl: "none"} }}
            >
                <Tab value="orders" label="Orders" />
                <Tab value="addresses" label="Addresses" />
            </Tabs>

            <Grid container spacing={2}>
                <Grid size={{xs: 12, xl: 7}}>
                    <Box sx={{display: { xs: tabLocation === "orders" ? "flex" : "none", xl: "flex" }, flexDirection: 'column', gap: 2}}>
                        <OrderCard
                            status="order placed"
                            itemData={[
                                { name: "Product 1", cost: "50", quantity: "1", totalCost: "50", imageUrl: "https://placehold.co/400" },
                                { name: "Product 2", cost: "25", quantity: "2", totalCost: "50", imageUrl: "https://placehold.co/400" },
                            ]}
                            orderSubtotal="100$"
                            extraFees={{ Shipping: "10$", Tax: "5$" }}
                            orderTotal="115$"
                            orderId="#123456"
                            orderDate={new Date(Date.now())}
                            shippingAddress={{
                                userLabel: "Home",
                                specificAddress: "Flat number 201, kiragi apartments",
                                street: "Near Hotel Transylvania, MG Road",
                                area: "George Highlands",
                                city: "Raidurgam",
                                state: "Telangana",
                                country: "India",
                                postcode: "530003"
                            }}
                            paymentDetails="Visa •••• 1234"
                            paymentMode="Pre Paid"
                            phoneNumber="+1 234 567 8901"
                            email="simba@example.com"
                        />

                        <OrderCard
                            status="delivered"
                            itemData={[
                                { name: "Product 1", cost: "50", quantity: "1", totalCost: "50", imageUrl: "https://placehold.co/400" },
                                { name: "Product 2", cost: "25", quantity: "2", totalCost: "50", imageUrl: "https://placehold.co/400" },
                            ]}
                            orderSubtotal="100$"
                            extraFees={{ Shipping: "10$", Tax: "5$" }}
                            orderTotal="115$"
                            orderId="#123456"
                            orderDate={new Date(Date.now())}
                            shippingAddress={{
                                userLabel: "Home",
                                specificAddress: "Flat number 340, kiragi apartments",
                                street: "Near Hotel Transylvania, MG Road",
                                area: "George Highlands",
                                city: "Raidurgam",
                                state: "Telangana",
                                country: "India",
                                postcode: "530003"
                            }}
                            paymentDetails="COD"
                            paymentMode="Cash on Delivery"
                            phoneNumber="+1 234 567 8901"
                            email="simba@example.com"
                        />
                    </Box>
                </Grid>
                <Grid size={{xs: 12, xl: 5}} sx={{display: 'flex', justifyContent: "center"}}>
                    <AddressPanel sx={{display: { xs: tabLocation === "addresses" ? "flex" : "none", xl: "flex" }}} />
                </Grid>
            </Grid>
            
            
        </Container>
    );
}