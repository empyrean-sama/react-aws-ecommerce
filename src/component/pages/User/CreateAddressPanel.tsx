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

export interface ISaveAddressErrorStates {
    setLabelError: React.Dispatch<React.SetStateAction<string>>;
    setPhoneError: React.Dispatch<React.SetStateAction<string>>;
    setPostCodeError: React.Dispatch<React.SetStateAction<string>>;
    setSpecificAddressError: React.Dispatch<React.SetStateAction<string>>;
    setStreetError: React.Dispatch<React.SetStateAction<string>>;
    setAreaError: React.Dispatch<React.SetStateAction<string>>;
    setCityError: React.Dispatch<React.SetStateAction<string>>;
    setStateError: React.Dispatch<React.SetStateAction<string>>;
    setCountryError: React.Dispatch<React.SetStateAction<string>>;
    areLocationCoordinatesAvailable: boolean;
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
    onSaveAddress: (callbacks: ISaveAddressErrorStates) => void;

    // Optional UI customizations for reuse in checkout and other contexts
    primaryActionLabel?: string;
    showActionButtons?: boolean;
    isEmbedded?: boolean;
    showFormModeChip?: boolean;
    showLabelField?: boolean;
}

export default function CreateAddressPanel(props: CreateAddressPanelProps) {
    const showActionButtons = props.showActionButtons ?? true;
    const isEmbedded = props.isEmbedded ?? false;
    const showFormModeChip = props.showFormModeChip ?? true;
    const showLabelField = props.showLabelField ?? true;

    // State for this component
    const [suggestionText, setSuggestionText] = React.useState<string>("");
    const [areCoordinatesAvailable, setAreCoordinatesAvailable] = React.useState<boolean>((props.formMode === "Editing Address")? props.addressToEdit.latitude !== undefined && props.addressToEdit.longitude !== undefined : false);

    const [labelError, setLabelError] = React.useState<string>("");
    const [phoneError, setPhoneError] = React.useState<string>("");
    const [postCodeError, setPostCodeError] = React.useState<string>("");
    const [specificAddressError, setSpecificAddressError] = React.useState<string>("");
    const [streetError, setStreetError] = React.useState<string>("");
    const [areaError, setAreaError] = React.useState<string>("");
    const [cityError, setCityError] = React.useState<string>("");
    const [stateError, setStateError] = React.useState<string>("");
    const [countryError, setCountryError] = React.useState<string>("");

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
                userLabel: prevValue.userLabel ?? '',
                phoneNumber: prevValue.phoneNumber ?? '',
                specificAddress: prevValue.specificAddress ?? '',

                street: suggestion.value["street"] || "",
                area: suggestion.value["district"] || "",
                city: suggestion.value["city"] || "",
                state: suggestion.value["state"] || "",
                country: suggestion.value["country"] || "",
                postcode: suggestion.value["postcode"] || "",

                latitude: suggestion.value["lat"],
                longitude: suggestion.value["lon"],
            };
        });
    }

    return (
        <Paper
            elevation={0}
            variant={isEmbedded ? undefined : "outlined"}
            sx={{
                p: isEmbedded ? 0 : 2.5,
                borderRadius: isEmbedded ? 0 : 2,
                boxShadow: 'none',
                border: isEmbedded ? 'none' : undefined,
                width: '100%',
                bgcolor: 'transparent',
            }}
        >
            <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {showFormModeChip && <Chip label={props.formMode} size="small" color={getChipColor(props.formMode)} />}
                        {showLabelField && <Typography variant="subtitle2" color="text.secondary">{props.addressToEdit.userLabel ?? ''}</Typography>}
                    </Box>
                    {showActionButtons && (
                        <IconButton size="small" onClick={props.onCancelForm} disabled={props.isLoading}><CloseIcon fontSize="small" /></IconButton>
                    )}
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
                        handleOnClose={() => setAreCoordinatesAvailable(false)}
                    />                   : 
                    <AskToGetCoordinatesNotice setAreGettingCoordinates={setAreCoordinatesAvailable} />
                }
                
                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                    {showLabelField && (
                        <TextField
                            label="Label"
                            size="small"
                            placeholder="Home, Work, Parents, etc."
                            fullWidth
                            value={props.addressToEdit.userLabel ?? ''}
                            onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, userLabel: e.target.value })}
                            error={!!labelError}
                            helperText={labelError}
                        />
                    )}
                    <TextField
                        label="Phone"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.phoneNumber ?? ''}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, phoneNumber: e.target.value })}
                        error={!!phoneError}
                        helperText={phoneError}
                        placeholder="+91XXXXXXXXXX"
                    />
                    <TextField
                        label="Postcode"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.postcode ?? ''}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, postcode: e.target.value })}
                        error={!!postCodeError}
                        helperText={postCodeError}
                    />
                </Box>

                <TextField
                    label="Flat / door / building"
                    size="small"
                    fullWidth
                    value={props.addressToEdit.specificAddress ?? ''}
                    onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, specificAddress: e.target.value })}
                    error={!!specificAddressError}
                    helperText={specificAddressError}
                />

                <TextField
                    label="Street / locality"
                    size="small"
                    fullWidth
                    value={props.addressToEdit.street ?? ''}
                    onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, street: e.target.value })}
                    error={!!streetError}
                    helperText={streetError}
                />

                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                    <TextField
                        label="Area"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.area ?? ''}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, area: e.target.value })}
                        error={!!areaError}
                        helperText={areaError}
                    />
                    <TextField
                        label="City"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.city ?? ''}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, city: e.target.value })}
                        error={!!cityError}
                        helperText={cityError}
                    />
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                    <TextField
                        label="State"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.state ?? ''}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, state: e.target.value })}
                        error={!!stateError}
                        helperText={stateError}
                    />
                    <TextField
                        label="Country"
                        size="small"
                        fullWidth
                        value={props.addressToEdit.country ?? ''}
                        onChange={(e) => props.setAddressToEdit({ ...props.addressToEdit, country: e.target.value })}
                        error={!!countryError}
                        helperText={countryError}
                    />
                </Box>

                {showActionButtons && (
                    <>
                        <Divider />

                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                            <Button onClick={props.onCancelForm} size="small" disabled={props.isLoading}>Cancel</Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<SaveIcon />}
                                onClick={() => props.onSaveAddress({
                                    setLabelError,
                                    setPhoneError,
                                    setPostCodeError,
                                    setSpecificAddressError,
                                    setStreetError,
                                    setAreaError,
                                    setCityError,
                                    setStateError,
                                    setCountryError,
                                    areLocationCoordinatesAvailable: areCoordinatesAvailable,
                                })}
                                disabled={props.isLoading}
                            >
                                {props.primaryActionLabel || 'Save address'}
                            </Button>
                        </Box>
                    </>
                )}
            </Stack>
        </Paper>
    );
}

function AskToGetCoordinatesNotice(props: { setAreGettingCoordinates: React.Dispatch<React.SetStateAction<boolean>> }) {
    return (
         <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed", width: "100%", aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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
                Add your coordinates
            </Button>
        </Paper>
    );
}