import React from 'react';
import { Box, Container, Divider, Paper, Stack, Typography, Link } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

import UtilityService from '../../../service/UtilityService';
import Constants from '../../../Constants';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';

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

function formatAddressLines(data: IContactUsData): string[] {
    const lines: string[] = [];
    if (data.specificAddress) lines.push(data.specificAddress);
    if (data.street) lines.push(data.street);

    const cityLine = [data.area, data.city].filter(Boolean).join(', ');
    if (cityLine) lines.push(cityLine);

    const stateLine = [data.state, data.postcode].filter(Boolean).join(' ');
    if (stateLine) lines.push(stateLine);

    if (data.country) lines.push(data.country);
    return lines;
}

function hasCoordinates(data: IContactUsData): boolean {
    return data.latitude !== 0 || data.longitude !== 0;
}

export default function ContactUs() {
    const utilityService = UtilityService.getInstance();
    const { setIsLoading, getIsLoading } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [contactData, setContactData] = React.useState<IContactUsData | null>(null);

    React.useEffect(() => {
        setIsLoading(true);
        (async () => {
            try {
                const data = await utilityService.getList(Constants.CONTACT_US_KEY);
                if (data.length > 0) {
                    setContactData(data[0] as IContactUsData);
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    if (getIsLoading()) return null;

    if (!contactData) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <Typography variant="h3" component="h1" gutterBottom>
                        Contact Us
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Typography color="text.secondary">
                        Contact information is not available yet — check back soon!
                    </Typography>
                </Paper>
            </Container>
        );
    }

    const addressLines = formatAddressLines(contactData);
    const showMap = hasCoordinates(contactData);
    const mapSrc = showMap
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${contactData.longitude - 0.005}%2C${contactData.latitude - 0.003}%2C${contactData.longitude + 0.005}%2C${contactData.latitude + 0.003}&layer=mapnik&marker=${contactData.latitude}%2C${contactData.longitude}`
        : '';

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: { xs: 3, md: 5 } }}>
                <Typography variant="h3" component="h1" gutterBottom>
                    Contact Us
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Stack spacing={4}>
                    {/* Business name */}
                    {contactData.businessName && (
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {contactData.businessName}
                        </Typography>
                    )}

                    {/* Map + Address side-by-side on desktop, stacked on mobile */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: showMap ? '1.2fr 0.8fr' : '1fr' },
                            gap: 3,
                        }}
                    >
                        {/* Map */}
                        {showMap && (
                            <Box
                                sx={{
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    border: 1,
                                    borderColor: 'divider',
                                    minHeight: { xs: 250, md: 320 },
                                }}
                            >
                                <Box
                                    component="iframe"
                                    src={mapSrc}
                                    title="Location map"
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: { xs: 250, md: 320 },
                                        border: 'none',
                                        display: 'block',
                                    }}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                />
                            </Box>
                        )}

                        {/* Address + Contact details */}
                        <Stack spacing={2.5} justifyContent="center">
                            {/* Address block */}
                            {addressLines.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    <LocationOnIcon color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                            Address
                                        </Typography>
                                        {addressLines.map((line, i) => (
                                            <Typography key={i} variant="body1" color="text.secondary">
                                                {line}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Phone */}
                            {contactData.phoneNumber && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    <PhoneIcon color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                            Phone
                                        </Typography>
                                        <Link
                                            href={`tel:${contactData.phoneNumber.replace(/\s/g, '')}`}
                                            underline="hover"
                                            color="text.secondary"
                                        >
                                            <Typography variant="body1">{contactData.phoneNumber}</Typography>
                                        </Link>
                                    </Box>
                                </Box>
                            )}

                            {/* Email */}
                            {contactData.email && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    <EmailIcon color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                            Email
                                        </Typography>
                                        <Link
                                            href={`mailto:${contactData.email}`}
                                            underline="hover"
                                            color="text.secondary"
                                        >
                                            <Typography variant="body1">{contactData.email}</Typography>
                                        </Link>
                                    </Box>
                                </Box>
                            )}

                            {/* Directions link */}
                            {showMap && (
                                <Link
                                    href={`https://www.openstreetmap.org/?mlat=${contactData.latitude}&mlon=${contactData.longitude}#map=17/${contactData.latitude}/${contactData.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1 }}
                                >
                                    <LocationOnIcon fontSize="small" />
                                    <Typography variant="body2">View on OpenStreetMap</Typography>
                                </Link>
                            )}
                        </Stack>
                    </Box>
                </Stack>
            </Paper>
        </Container>
    );
}
