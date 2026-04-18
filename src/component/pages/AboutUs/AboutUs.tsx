import React from 'react';
import { Box, CircularProgress, Container, Divider, Paper, Typography, useTheme } from '@mui/material';
import UtilityService from '../../../service/UtilityService';
import Constants from '../../../Constants';

interface IAboutUsSection {
    heading: string;
    content: string;
}

export default function AboutUs() {
    const utilityService = UtilityService.getInstance();
    const theme = useTheme();

    const [sections, setSections] = React.useState<IAboutUsSection[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        (async () => {
            try {
                const data = await utilityService.getList(Constants.ABOUT_US_LIST_KEY);
                setSections(data as IAboutUsSection[]);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: { xs: 3, md: 5 } }}>
                <Typography variant="h3" component="h1" gutterBottom>
                    About Us
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : sections.length === 0 ? (
                    <Typography color="text.secondary">
                        Nothing here yet — check back soon!
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {sections.map((section, index) => (
                            <Box key={index}>
                                {section.heading && (
                                    <>
                                        <Typography
                                            variant="h5"
                                            component="h2"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'primary.main',
                                                mb: 0.75,
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {section.heading}
                                        </Typography>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 3,
                                                borderRadius: 1,
                                                backgroundColor: 'primary.main',
                                                mb: 1.5,
                                                opacity: 0.6,
                                            }}
                                        />
                                    </>
                                )}
                                {section.content && section.content.split('\n').map((paragraph, pIndex) =>
                                    paragraph.trim() ? (
                                        <Typography key={pIndex} variant="body1" paragraph>
                                            {paragraph}
                                        </Typography>
                                    ) : null
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </Paper>
        </Container>
    );
}
