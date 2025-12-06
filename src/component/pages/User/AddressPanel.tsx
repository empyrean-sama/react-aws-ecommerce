import React, { useEffect, useState } from "react";
import ProfileService from "../../../service/ProfileService";

import { Typography, Box, Button, Paper, Stack, SxProps} from "@mui/material";
import CreateAddressPanel, { ISaveAddressErrorStates } from "./CreateAddressPanel";
import AddressCard from "./AddressCard";

import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import IAddressRecord from "../../../interface/IAddressRecord";
import IAddress from "../../../interface/IAddress";

import { createEmptyAddress } from "../../../interface/IAddress";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

import {areCoordinatesValid, isAreaValid, isCityValid, isCountryValid, isLabelValid, isSpecificAddressValid, isStateValid, isStreetValid, isPostcodeValid} from '../../../Helper';

export default function AddressPanel(props: {sx?: SxProps}) {

    // Global API
    const { getLoggedInDetails, showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const profileService = ProfileService.getInstance();

    // State variables
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const formMode = editingAddressId ? "Editing Address" : "New Address";
    
    const [addresses, setAddresses] = useState<IAddressRecord[]>([]);
    const [addressToEdit, setAddressToEdit] = useState<IAddress>(createEmptyAddress());

    const [canShowAddFirstAddressHint, setCanShowAddFirstAddressHint] = React.useState<boolean>(false);

    // Effects
    useEffect(() => {
        // Populate the saved addresses for this user
        let isMounted = true;
        (async () => {
            try {
                const user = getLoggedInDetails();
                if (!user?.userId) {
                    if(isMounted) {
                        setIsLoading(false);
                    }
                    return;
                }
                const fetched = await profileService.getAddressesByUserId(user.userId);
                if(isMounted) {
                    setAddresses(fetched ?? []);
                    setCanShowAddFirstAddressHint(true);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error(error);
                showMessage("Unable to load addresses right now.", ESnackbarMsgVariant.error);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [getLoggedInDetails]);

    // Private Routines
    async function handleSaveAddress(callbacks: ISaveAddressErrorStates) {
        const specificAddressValidation = isSpecificAddressValid(addressToEdit.specificAddress);
        const areaValidation = isAreaValid(addressToEdit.area);
        const cityValidation = isCityValid(addressToEdit.city);
        const stateValidation = isStateValid(addressToEdit.state);
        const countryValidation = isCountryValid(addressToEdit.country);
        const postcodeValidation = isPostcodeValid(addressToEdit.postcode);
        const streetValidation = isStreetValid(addressToEdit.street);
        const labelValidation = isLabelValid(addressToEdit.userLabel);
        const coordinatesValidation = areCoordinatesValid(addressToEdit.latitude, addressToEdit.longitude);

        callbacks.setSpecificAddressError(specificAddressValidation.errorMessage);
        callbacks.setAreaError(areaValidation.errorMessage);
        callbacks.setCityError(cityValidation.errorMessage);
        callbacks.setStateError(stateValidation.errorMessage);
        callbacks.setCountryError(countryValidation.errorMessage);
        callbacks.setPostCodeError(postcodeValidation.errorMessage);
        callbacks.setStreetError(streetValidation.errorMessage);
        callbacks.setLabelError(labelValidation.errorMessage);

        function isLocationValid() {
            if(callbacks.areLocationCoordinatesAvailable) {
                return coordinatesValidation.isValid;
            }
            return true;
        }

        if(specificAddressValidation.isValid && areaValidation.isValid && cityValidation.isValid &&
           stateValidation.isValid && countryValidation.isValid && postcodeValidation.isValid &&
           streetValidation.isValid && labelValidation.isValid && isLocationValid()) {
            
            setIsLoading(true);
            try {
                if(editingAddressId === null) {
                    const newRecord = await profileService.addAddress(
                        { ...addressToEdit, 
                            latitude: callbacks.areLocationCoordinatesAvailable ? addressToEdit.latitude : undefined, 
                            longitude: callbacks.areLocationCoordinatesAvailable ? addressToEdit.longitude : undefined 
                        });
                    setAddresses((prev) => [...prev, newRecord]);
                    setShowCreateForm(false);
                }
                else
                {
                    const newRecord = await profileService.updateAddress(editingAddressId, {...addressToEdit, 
                        latitude: callbacks.areLocationCoordinatesAvailable ? addressToEdit.latitude : undefined, 
                        longitude: callbacks.areLocationCoordinatesAvailable ? addressToEdit.longitude : undefined 
                    });
                    setAddresses((prev) => prev.map((addr) => addr.addressId === editingAddressId ? newRecord : addr));
                    setShowCreateForm(false);
                    setEditingAddressId(null);
                }
            }
            catch (error) {
                console.error(error);
                showMessage("Unable to save address right now.", ESnackbarMsgVariant.error);
            } finally {
                setIsLoading(false);
            }
        }
    }

    function handleCancelAddressForm() {
        setShowCreateForm(false);
        setEditingAddressId(null);
        setAddressToEdit(createEmptyAddress());
    }

    function handleAddressCardEdit(addressId: string) {
        const address = addresses.find(addr => addr.addressId === addressId);
        if (address) {
            setAddressToEdit(address);
            setEditingAddressId(addressId);
            setShowCreateForm(true);
        }
    }

    async function handleAddressCardDelete(addressId: string) {
        const confirmDelete = window.confirm("Are you sure you want to delete this address?");
        if (!confirmDelete) {
            return;
        }
        // Add logic to delete the address here
        setIsLoading(true);
        try {
            await profileService.deleteAddress(addressId);
            setAddresses((prev) => prev.filter((addr) => addr.addressId !== addressId));
            showMessage("Address deleted successfully.", ESnackbarMsgVariant.success);
        } catch (error) {
            console.error(error);
            showMessage("Unable to delete address right now.", ESnackbarMsgVariant.error);
        } finally {
            setIsLoading(false);
        }
    }

    const AddressList = React.useMemo(() => 
        <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 480, overflowY: "auto", pr: 0.5 }}>
            {addresses.map((address) => (
                <AddressCard
                    key={address.addressId}
                    address={address}
                    onEdit={handleAddressCardEdit}
                    onDelete={handleAddressCardDelete}
                    isBusy={isLoading}
                />
            ))}
        </Stack>
    , [addresses, isLoading]);

    return (
        <Box sx={{...props.sx, alignSelf: "flex-start" }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="h4" component="h2">Saved Addresses</Typography>
                    <Button size="small" startIcon={<AddLocationAltIcon />} variant="contained" onClick={() => setShowCreateForm(true)} disabled={showCreateForm || isLoading}>Add new</Button>
                </Box>

                <Typography variant="body2" color="text.secondary">Manage where we ship your orders. You can add multiple addresses and quickly switch between them while checking out.</Typography>

                {/** If no addresses are found, then ask the user to add their first address */}
                {!isLoading && addresses.length === 0 && !showCreateForm && canShowAddFirstAddressHint && (
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
                        onCancelForm={handleCancelAddressForm}
                        onSaveAddress={handleSaveAddress}
                        addressToEdit={addressToEdit}
                        setAddressToEdit={setAddressToEdit}
                    />
                )}

                {!isLoading && addresses.length > 0 && AddressList}
            </Paper>
        </Box>
    );
}