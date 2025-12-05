import React, { useState } from "react";
import { Typography, Box, Button, Paper, Stack} from "@mui/material";
import CreateAddressPanel from "./CreateAddressPanel";
import AddressCard from "./AddressCard";

import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import IAddressRecord from "../../../interface/IAddressRecord";
import IAddress from "../../../interface/IAddress";

import { createEmptyAddress } from "../../../interface/IAddress";

export default function AddressPanel() {

    // State variables
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [formMode, setFormMode] = React.useState<"New Address" | "Editing Address">("New Address");
    
    const [addresses, setAddresses] = useState<IAddressRecord[]>([]);
    const [addressToEdit, setAddressToEdit] = useState<IAddress>(createEmptyAddress());

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="h4" component="h2">Saved Addresses</Typography>
                <Button size="small" startIcon={<AddLocationAltIcon />} variant="contained" onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>Add new</Button>
            </Box>

            <Typography variant="body2" color="text.secondary">Manage where we ship your orders. You can add multiple addresses and quickly switch between them while checking out.</Typography>

            {/** If no addresses are found, then ask the user to add their first address */}
            {!isLoading && addresses.length === 0 && !showCreateForm && (
                <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}>
                    <Typography variant="body1" gutterBottom>
                        You don&apos;t have any saved addresses yet.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Add your home or work address to speed up checkout.
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddLocationAltIcon />}
                        size="small"
                        onClick={() => setShowCreateForm(true)}
                    >
                        Add your first address
                    </Button>
                </Paper>
            )}

            {showCreateForm && (
                <CreateAddressPanel
                    formMode={formMode}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    onCancelForm={() => setShowCreateForm(false)}
                    onSaveAddress={() => setShowCreateForm(false)}
                    addressToEdit={addressToEdit}
                    setAddressToEdit={setAddressToEdit}
                />
            )}

            {!isLoading && addresses.length > 0 && (
                <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 480, overflowY: "auto", pr: 0.5 }}>
                    {addresses.map((address) => (
                        <AddressCard
                            key={address.addressId}
                            address={address}
                            onEdit={() => {}}
                            onDelete={() => {}}
                            isBusy={isLoading}
                        />
                    ))}
                </Stack>
            )}
        </Paper>
    );
}