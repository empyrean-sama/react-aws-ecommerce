import React from 'react';
import {
    Box,
    Button,
    Container,
    Divider,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SaveIcon from '@mui/icons-material/Save';

import UtilityService from '../../../../service/UtilityService';
import Constants from '../../../../Constants';
import { appGlobalStateContext } from '../../../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../../enum/ESnackbarMsgVariant';

interface IAboutUsSection {
    heading: string;
    content: string;
}

const MAX_SECTIONS = 20;

export default function AboutUsManagement() {
    const utilityService = UtilityService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [sections, setSections] = React.useState<IAboutUsSection[]>([]);
    const [savedSections, setSavedSections] = React.useState<IAboutUsSection[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isSaving, setIsSaving] = React.useState<boolean>(false);

    const isDirty = React.useMemo(
        () => JSON.stringify(sections) !== JSON.stringify(savedSections),
        [sections, savedSections]
    );

    React.useEffect(() => {
        (async () => {
            try {
                const data = await utilityService.getList(Constants.ABOUT_US_LIST_KEY);
                const typed = data as IAboutUsSection[];
                setSections(typed);
                setSavedSections(typed);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    async function handleSave() {
        setIsSaving(true);
        try {
            const result = await utilityService.saveList(Constants.ABOUT_US_LIST_KEY, sections);
            if (result.isSuccess) {
                setSavedSections(sections);
                showMessage('About Us page saved successfully.', ESnackbarMsgVariant.success);
            } else {
                showMessage(result.message ?? 'Failed to save.', ESnackbarMsgVariant.error);
            }
        } finally {
            setIsSaving(false);
        }
    }

    function handleAddSection() {
        if (sections.length >= MAX_SECTIONS) {
            showMessage(`Maximum of ${MAX_SECTIONS} sections allowed.`, ESnackbarMsgVariant.warning);
            return;
        }
        setSections(prev => [...prev, { heading: '', content: '' }]);
    }

    function handleDeleteSection(index: number) {
        setSections(prev => prev.filter((_, i) => i !== index));
    }

    function handleMoveSection(index: number, direction: 'up' | 'down') {
        setSections(prev => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const updated = [...prev];
            const [moved] = updated.splice(index, 1);
            updated.splice(newIndex, 0, moved);
            return updated;
        });
    }

    function handleChangeField(index: number, field: keyof IAboutUsSection, value: string) {
        setSections(prev =>
            prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
        );
    }

    return (
        <Paper>
            <Container maxWidth="xl">
                {(isLoading || isSaving) && <LinearProgress />}
                <Stack spacing={2} sx={{ py: 3 }}>
                    <Box>
                        <Typography variant="h2">About Us Management</Typography>
                        <Typography color="text.secondary">
                            Manage the sections displayed on the public About Us page. Each section has a subheading and body text.
                        </Typography>
                    </Box>

                    <Divider />

                    {sections.length === 0 && !isLoading && (
                        <Typography color="text.secondary">
                            No sections yet. Click "Add Section" to get started.
                        </Typography>
                    )}

                    <Stack spacing={2}>
                        {sections.map((section, index) => (
                            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Section {index + 1}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Move up">
                                                <span>
                                                    <IconButton size="small" onClick={() => handleMoveSection(index, 'up')} disabled={index === 0}>
                                                        <ArrowUpwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Move down">
                                                <span>
                                                    <IconButton size="small" onClick={() => handleMoveSection(index, 'down')} disabled={index === sections.length - 1}>
                                                        <ArrowDownwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Delete section">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteSection(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>

                                    <TextField
                                        label="Subheading"
                                        value={section.heading}
                                        onChange={e => handleChangeField(index, 'heading', e.target.value)}
                                        fullWidth
                                        size="small"
                                        placeholder="e.g. Who We Are"
                                    />
                                    <TextField
                                        label="Paragraph content"
                                        value={section.content}
                                        onChange={e => handleChangeField(index, 'content', e.target.value)}
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        placeholder="Write the paragraph text here. Use a new line to start a new paragraph."
                                    />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddSection}
                            disabled={isLoading || isSaving || sections.length >= MAX_SECTIONS}
                        >
                            Add Section
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={isLoading || isSaving || !isDirty}
                        >
                            Save
                        </Button>
                    </Box>
                </Stack>
            </Container>
        </Paper>
    );
}
