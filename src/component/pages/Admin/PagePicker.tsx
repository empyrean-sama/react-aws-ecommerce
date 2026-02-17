import React from "react";
import { useNavigate } from "react-router";

import { Card, CardActionArea, Box, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import ProductService from "../../../service/ProductService";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

export default function PagePicker() {
    // Global API
    const navigateTo = useNavigate();
    const productService = ProductService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = React.useState<boolean>(false);
    const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);

    async function handleConfirmRegenerateSearchIndex() {
        try {
            setIsRegenerating(true);
            const result = await productService.regenerateProductSearchIndex();
            showMessage(`Search index regenerated (${result.totalProducts} products).`, ESnackbarMsgVariant.success);
            setIsRegenerateDialogOpen(false);
        } catch (error: any) {
            showMessage(error?.message || 'Unable to regenerate search index right now', ESnackbarMsgVariant.error);
        } finally {
            setIsRegenerating(false);
        }
    }

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <PagePickerCard 
                    heading="View & Edit Your Store Catalog" 
                    description="View & Customize products available in your store, manage inventory, and update product details to keep your catalog up-to-date."
                    handleAction={() => navigateTo("/admin/catalog")}
                />
                <PagePickerCard 
                    heading="Promotion Management" 
                    description="Various promotions can be created to boost sales and attract customers. Manage existing promotions or create new ones here."
                    handleAction={() => navigateTo("/admin/promotions")}
                />
                <PagePickerCard
                    heading="Regenerate Search Indices"
                    description="Rebuild the product search JSON in S3 from all products so clients get the latest searchable names and images."
                    handleAction={() => setIsRegenerateDialogOpen(true)}
                />
            </Box>

            <Dialog
                open={isRegenerateDialogOpen}
                onClose={() => !isRegenerating && setIsRegenerateDialogOpen(false)}
                aria-labelledby="regenerate-search-index-dialog-title"
            >
                <DialogTitle id="regenerate-search-index-dialog-title">Regenerate Search Indices?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This scans all products and writes a fresh search index JSON file to S3. Continue?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsRegenerateDialogOpen(false)} disabled={isRegenerating}>Cancel</Button>
                    <Button onClick={handleConfirmRegenerateSearchIndex} color="primary" variant="contained" disabled={isRegenerating}>
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
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