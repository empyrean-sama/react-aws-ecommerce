import React from 'react';
import {
    Box,
    Button,
    Container,
    Divider,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import UtilityService from '../../../../service/UtilityService';
import Constants from '../../../../Constants';
import { appGlobalStateContext } from '../../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../../enum/ESnackbarMsgVariant';
import IAddress from '../../../../interface/IAddress';
import CreateAddressPanel from '../../User/CreateAddressPanel';

interface IContactUsData {
    businessName: string;
    specificAddress: string;
    street: string;
    area: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phoneNumber: string;
    email: string;
    latitude: number;
    longitude: number;
}

const PARIS_COORDINATES = {
    latitude: 48.8566,
    longitude: 2.3522,
};

function normalizeCoordinates(data: IContactUsData): IContactUsData {
    const hasCoordinates = data.latitude !== 0 || data.longitude !== 0;
    if (hasCoordinates) {
        return data;
    }

    return {
        ...data,
        latitude: PARIS_COORDINATES.latitude,
        longitude: PARIS_COORDINATES.longitude,
    };
}

function createEmptyContactData(): IContactUsData {
    return {
        businessName: '',
        specificAddress: '',
        street: '',
        area: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
        phoneNumber: '',
        email: '',
        latitude: PARIS_COORDINATES.latitude,
        longitude: PARIS_COORDINATES.longitude,
    };
}

function contactDataToAddress(data: IContactUsData): IAddress {
    return {
        userLabel: data.businessName,
        phoneNumber: data.phoneNumber,
        specificAddress: data.specificAddress,
        street: data.street,
        area: data.area,
        city: data.city,
        state: data.state,
        country: data.country,
        postcode: data.postcode,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
    };
}

function addressToContactData(address: IAddress, prev: IContactUsData): IContactUsData {
    return {
        ...prev,
        specificAddress: address.specificAddress,
        street: address.street,
        area: address.area,
        city: address.city,
        state: address.state,
        country: address.country,
        postcode: address.postcode,
        phoneNumber: address.phoneNumber,
        latitude: address.latitude ?? 0,
        longitude: address.longitude ?? 0,
    };
}

export default function ContactUsManagement() {
    const utilityService = UtilityService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [contactData, setContactData] = React.useState<IContactUsData>(createEmptyContactData());
    const [savedData, setSavedData] = React.useState<IContactUsData>(createEmptyContactData());
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isSaving, setIsSaving] = React.useState<boolean>(false);

    const isDirty = React.useMemo(
        () => JSON.stringify(contactData) !== JSON.stringify(savedData),
        [contactData, savedData]
    );

    // Bridge IAddress state for CreateAddressPanel
    const addressForPanel = React.useMemo(() => contactDataToAddress(contactData), [contactData]);
    const setAddressForPanel: React.Dispatch<React.SetStateAction<IAddress>> = React.useCallback(
        (action) => {
            setContactData(prev => {
                const prevAddress = contactDataToAddress(prev);
                const newAddress = typeof action === 'function' ? action(prevAddress) : action;
                return addressToContactData(newAddress, prev);
            });
        },
        []
    );

    React.useEffect(() => {
        (async () => {
            try {
                const data = await utilityService.getList(Constants.CONTACT_US_KEY);
                if (data.length > 0) {
                    const loaded = normalizeCoordinates(data[0] as IContactUsData);
                    setContactData(loaded);
                    setSavedData(loaded);
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    async function handleSave() {
        setIsSaving(true);
        try {
            const result = await utilityService.saveList(Constants.CONTACT_US_KEY, [contactData]);
            if (result.isSuccess) {
                setSavedData(contactData);
                showMessage('Contact Us page saved successfully.', ESnackbarMsgVariant.success);
            } else {
                showMessage(result.message ?? 'Failed to save.', ESnackbarMsgVariant.error);
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Paper>
            <Container maxWidth="xl">
                {(isLoading || isSaving) && <LinearProgress />}
                <Stack spacing={2} sx={{ py: 3 }}>
                    <Box>
                        <Typography variant="h2">Contact Us Management</Typography>
                        <Typography color="text.secondary">
                            Configure the address and contact details displayed on the public Contact Us page. Use the search bar to find an address and auto-fill the form.
                        </Typography>
                    </Box>

                    <Divider />

                    {!isLoading && (
                        <Stack spacing={3}>
                            <Typography variant="h6">Business Details</Typography>
                            <TextField
                                label="Business Name"
                                value={contactData.businessName}
                                onChange={e => setContactData(prev => ({ ...prev, businessName: e.target.value }))}
                                fullWidth
                                size="small"
                                placeholder="e.g. Srividhya Foods"
                            />
                            <TextField
                                label="Email"
                                value={contactData.email}
                                onChange={e => setContactData(prev => ({ ...prev, email: e.target.value }))}
                                fullWidth
                                size="small"
                                placeholder="e.g. support@example.com"
                            />

                            <Divider />

                            <Box>
                                <Typography variant="h6">Address & Location</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                                    Search for an address to auto-fill, then fine-tune. Drag the map to adjust the pin location. <br />
                                    Alternatively, you can get the coordinates from Google Maps and enter them manually. If no coordinates are provided, the location will default to Paris, France.
                                </Typography>
                                <CreateAddressPanel
                                    formMode="Editing Address"
                                    isLoading={isSaving}
                                    setIsLoading={setIsSaving}
                                    addressToEdit={addressForPanel}
                                    setAddressToEdit={setAddressForPanel}
                                    onCancelForm={() => {}}
                                    onSaveAddress={() => {}}
                                    showActionButtons={false}
                                    isEmbedded={true}
                                    showFormModeChip={false}
                                    showLabelField={false}
                                    showManualCoordinateFields={true}
                                    alwaysShowCoordinatesEditor={true}
                                    layout="horizontal"
                                    defaultLocation={[PARIS_COORDINATES.latitude, PARIS_COORDINATES.longitude]}
                                />
                            </Box>
                        </Stack>
                    )}

                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={!isDirty || isSaving || isLoading}
                        >
                            Save
                        </Button>
                    </Box>
                </Stack>
            </Container>
        </Paper>
    );
}
