import React from "react";
import ProfileService from "../../../service/ProfileService";

import { Typography, Box, Paper, Stack, Chip, TextField, IconButton, Divider, Button } from "@mui/material";
import AutofillTextField, { ISuggestion } from "../../ui/AutofillTextField";

import IAddress from "../../../interface/IAddress";
import { JsonLike } from "../../../infrastructure/lambda/Helper";

import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import SelectLocation from "../../ui/SelectLocationWidget";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";

function getChipColor(formMode: "New Address" | "Editing Address") {
    return formMode === "New Address" ? "primary" : "warning";
}

export interface CreateAddressPanelProps {
    
    // Are we creating a new address or editing an existing one?
    formMode: "New Address" | "Editing Address";
    
    // Useful to disable the form while loading/saving
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;

    // The address currently being edited
    addressToEdit: IAddress;
    setAddressToEdit: React.Dispatch<React.SetStateAction<IAddress>>;

    // Event handlers that will be called when the user cancels or saves the form
    onCancelForm: () => void;
    onSaveAddress: () => void;    
}

export default function CreateAddressPanel(props: CreateAddressPanelProps) {

    // State for this component
    const [suggestionText, setSuggestionText] = React.useState<string>("");
    const [areCoordinatesAvailable, setAreCoordinatesAvailable] = React.useState<boolean>(false);

    // Private Routines
    async function fetchSuggestions(trimmedInput: string): Promise<ISuggestion[]> {
        const profileService = ProfileService.getInstance();
        const suggestions = await profileService.getAutofillAddressSuggestions(trimmedInput);

        return (suggestions as any).results.map((result: JsonLike) => {
            return {
                labelTitle: result["address_line1"],
                labelDescription: result["formatted"],
                value: result
            };
        });
    }

    function handleSuggestionSelected(suggestion: ISuggestion) {
        setAreCoordinatesAvailable(true);
        props.setAddressToEdit((prevValue) => {
            return {
                userLabel: prevValue.userLabel,
                specificAddress: prevValue.specificAddress,

                street: suggestion.value["street"] || "",
                area: suggestion.value["district"] || "",
                city: suggestion.value["city"] || "",
                state: suggestion.value["state"] || "",
                country: suggestion.value["country"] || "",
                postcode: suggestion.value["postcode"] || "",

                latitude: suggestion.value["lat"],
                longitude: suggestion.value["lon"],

                placeId: suggestion.value["place_id"] || "",
            };
        });
    }

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip label={props.formMode} size="small" color={getChipColor(props.formMode)} />
                        <Typography variant="subtitle2" color="text.secondary">{props.addressToEdit.userLabel}</Typography>
                    </Box>
                    <IconButton size="small" onClick={props.onCancelForm} disabled={props.isLoading}><CloseIcon fontSize="small" /></IconButton>
                </Box>

                <AutofillTextField 
                    label="Search address"
                    size="small"
                    fullWidth
                    value={suggestionText}
                    onTextInputChange={setSuggestionText}
                    tryFetchSuggestions={fetchSuggestions}
                    onSuggestionSelected={handleSuggestionSelected}
                />
                
                {areCoordinatesAvailable ?
                    <SelectLocation 
                        location={[props.addressToEdit.latitude || 0, props.addressToEdit.longitude || 0]}
                        setLocationChange={(coords) => props.setAddressToEdit({ ...props.addressToEdit, latitude: coords[0], longitude: coords[1] })}
                    />                   : 
                    <AskToGetCoordinatesNotice setAreGettingCoordinates={setAreCoordinatesAvailable} />
                }
                
                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                    <TextField
                        label="Label"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.userLabel}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, userLabel: e.target.value })}
                        helperText="Home, Work, Parents, etc."
                    />
                    <TextField
                        label="Postcode"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.postcode}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, postcode: e.target.value })}
                    />
                </Box>

                <TextField
                    label="Flat / door / building"
                    size="small"
                    fullWidth
                    value={props.addressToEdit.specificAddress}
                    onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, specificAddress: e.target.value })}
                />

                <TextField
                    label="Street / locality"
                    size="small"
                    fullWidth
                    value={props.addressToEdit.street}
                    onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, street: e.target.value })}
                />

                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                    <TextField
                        label="Area"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.area}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, area: e.target.value })}
                    />
                    <TextField
                        label="City"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.city}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, city: e.target.value })}
                    />
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                    <TextField
                        label="State"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.state}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, state: e.target.value })}
                    />
                    <TextField
                        label="Country"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.country}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, country: e.target.value })}
                    />
                </Box>

                <Divider />

                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button onClick={props.onCancelForm} size="small" disabled={props.isLoading}>Cancel</Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<SaveIcon />}
                        onClick={props.onSaveAddress}
                        disabled={props.isLoading}
                    >
                        Save address
                    </Button>
                </Box>
            </Stack>
        </Paper>
    );
}

function AskToGetCoordinatesNotice(props: { setAreGettingCoordinates: React.Dispatch<React.SetStateAction<boolean>> }) {
    return (
         <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}>
            <Typography variant="body1" gutterBottom>
                You are not submitting coordinates for this address.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Make it easy for delivery drivers to find you by providing location coordinates.
            </Typography>
            <Button
                variant="contained"
                startIcon={<AddLocationAltIcon />}
                size="small"
                onClick={() => props.setAreGettingCoordinates(true)}
            >
                Add your first address
            </Button>
        </Paper>
    );
}