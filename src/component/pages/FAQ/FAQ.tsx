import React from 'react';
import Fuse from 'fuse.js';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    CircularProgress,
    Container,
    Divider,
    InputAdornment,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import UtilityService from '../../../service/UtilityService';
import Constants from '../../../Constants';

interface IFAQItem {
    heading: string;
    content: string;
}

export default function FAQ() {
    const utilityService = UtilityService.getInstance();

    const [items, setItems] = React.useState<IFAQItem[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [search, setSearch] = React.useState<string>('');
    const [expanded, setExpanded] = React.useState<number | false>(false);

    React.useEffect(() => {
        (async () => {
            try {
                const data = await utilityService.getList(Constants.FAQ_LIST_KEY);
                setItems(data as IFAQItem[]);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const filteredItems = React.useMemo(() => {
        const q = search.trim();
        if (!q) return items;
        const fuse = new Fuse(items, {
            keys: ['heading', 'content'],
            threshold: 0.4,
            ignoreLocation: true,
        });
        return fuse.search(q).map(result => result.item);
    }, [items, search]);

    // Reset expanded panel when the filtered list changes
    React.useEffect(() => {
        setExpanded(false);
    }, [search]);

    function handleAccordionChange(index: number) {
        setExpanded(prev => (prev === index ? false : index));
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: { xs: 3, md: 5 } }}>
                <Typography variant="h3" component="h1" gutterBottom>
                    Frequently Asked Questions
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : items.length === 0 ? (
                    <Typography color="text.secondary">
                        Nothing here yet — check back soon!
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            placeholder="Search questions…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            size="small"
                            fullWidth
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        {filteredItems.length === 0 ? (
                            <Typography color="text.secondary" sx={{ mt: 1 }}>
                                No questions match your search.
                            </Typography>
                        ) : (
                            <Box>
                                {filteredItems.map((item, index) => (
                                    <Accordion
                                        key={index}
                                        expanded={expanded === index}
                                        onChange={() => handleAccordionChange(index)}
                                        disableGutters
                                        elevation={0}
                                        sx={{
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            '&:not(:last-child)': { borderBottom: 0 },
                                            '&::before': { display: 'none' },
                                            '&:first-of-type': { borderRadius: '8px 8px 0 0' },
                                            '&:last-of-type': { borderRadius: '0 0 8px 8px' },
                                        }}
                                    >
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            sx={{
                                                backgroundColor: expanded === index ? 'action.hover' : 'transparent',
                                                '& .MuiAccordionSummary-content': { my: 1 },
                                            }}
                                        >
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {item.heading}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 0, py: 2, px: 2 }}>
                                            {item.content.split('\n').map((paragraph, pIndex) =>
                                                paragraph.trim() ? (
                                                    <Typography key={pIndex} variant="body1" paragraph sx={{ mb: 1 }}>
                                                        {paragraph}
                                                    </Typography>
                                                ) : null
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>
        </Container>
    );
}
