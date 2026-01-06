import React from "react";
import { useNavigate } from "react-router";

import { Card, CardActionArea, Box, Typography } from "@mui/material";
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

export default function PagePicker() {
    // Global API
    const navigateTo = useNavigate();

    return (
        <PagePickerCard 
            heading="View & Edit Your Store Catalog" 
            description="View & Customize products available in your store, manage inventory, and update product details to keep your catalog up-to-date."
            handleAction={() => navigateTo("/admin/catalog")}
        />
    );
}

export interface AdminConsoleCardProps {
    heading: string,
    description: string,
    handleAction: () => void
}

function PagePickerCard({ heading, description, handleAction }: AdminConsoleCardProps) {
    return (
        <Card variant="compact">
            <CardActionArea sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={handleAction}>
                <Box>
                    <Typography variant="h5" component="div">
                        {heading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                </Box>
                <ArrowRightAltIcon />
            </CardActionArea>
        </Card>
    );
}