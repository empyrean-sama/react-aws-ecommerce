import React, { useEffect } from "react";
import AuthService from "../../../service/AuthService";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import { Container, Typography, Box } from "@mui/material";
import OrderCard from "./OrderCard";

export default function Account() {

    // Global API
    const { getLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const authService = AuthService.getInstance();
    const navigateTo = useNavigate();

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
        <Container maxWidth="xl">
            <Typography variant="h1" component="h1" gutterBottom>
                Hi {getLoggedInDetails()?.givenName} {getLoggedInDetails()?.familyName},
            </Typography>
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 1, mt: 2}}>
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
        </Container>
    );
}