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

interface IFAQItem {
    heading: string;
    content: string;
}

const MAX_ITEMS = 20;

export default function FAQManagement() {
    const utilityService = UtilityService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [items, setItems] = React.useState<IFAQItem[]>([]);
    const [savedItems, setSavedItems] = React.useState<IFAQItem[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isSaving, setIsSaving] = React.useState<boolean>(false);

    const isDirty = React.useMemo(
        () => JSON.stringify(items) !== JSON.stringify(savedItems),
        [items, savedItems]
    );

    React.useEffect(() => {
        (async () => {
            try {
                const data = await utilityService.getList(Constants.FAQ_LIST_KEY);
                const typed = data as IFAQItem[];
                setItems(typed);
                setSavedItems(typed);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    async function handleSave() {
        setIsSaving(true);
        try {
            const result = await utilityService.saveList(Constants.FAQ_LIST_KEY, items);
            if (result.isSuccess) {
                setSavedItems(items);
                showMessage('FAQ page saved successfully.', ESnackbarMsgVariant.success);
            } else {
                showMessage(result.message ?? 'Failed to save.', ESnackbarMsgVariant.error);
            }
        } finally {
            setIsSaving(false);
        }
    }

    function handleAddItem() {
        if (items.length >= MAX_ITEMS) {
            showMessage(`Maximum of ${MAX_ITEMS} items allowed.`, ESnackbarMsgVariant.warning);
            return;
        }
        setItems(prev => [...prev, { heading: '', content: '' }]);
    }

    function handleDeleteItem(index: number) {
        setItems(prev => prev.filter((_, i) => i !== index));
    }

    function handleMoveItem(index: number, direction: 'up' | 'down') {
        setItems(prev => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            const updated = [...prev];
            const [moved] = updated.splice(index, 1);
            updated.splice(newIndex, 0, moved);
            return updated;
        });
    }

    function handleChangeField(index: number, field: keyof IFAQItem, value: string) {
        setItems(prev =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    }

    return (
        <Paper>
            <Container maxWidth="xl">
                {(isLoading || isSaving) && <LinearProgress />}
                <Stack spacing={2} sx={{ py: 3 }}>
                    <Box>
                        <Typography variant="h2">FAQ Management</Typography>
                        <Typography color="text.secondary">
                            Manage the questions and answers displayed on the public FAQ page. Each entry has a question and an answer.
                        </Typography>
                    </Box>

                    <Divider />

                    {items.length === 0 && !isLoading && (
                        <Typography color="text.secondary">
                            No items yet. Click "Add Question" to get started.
                        </Typography>
                    )}

                    <Stack spacing={2}>
                        {items.map((item, index) => (
                            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Question {index + 1}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Move up">
                                                <span>
                                                    <IconButton size="small" onClick={() => handleMoveItem(index, 'up')} disabled={index === 0}>
                                                        <ArrowUpwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Move down">
                                                <span>
                                                    <IconButton size="small" onClick={() => handleMoveItem(index, 'down')} disabled={index === items.length - 1}>
                                                        <ArrowDownwardIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Delete question">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteItem(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>

                                    <TextField
                                        label="Question"
                                        value={item.heading}
                                        onChange={e => handleChangeField(index, 'heading', e.target.value)}
                                        fullWidth
                                        size="small"
                                        placeholder="e.g. What is your return policy?"
                                    />
                                    <TextField
                                        label="Answer"
                                        value={item.content}
                                        onChange={e => handleChangeField(index, 'content', e.target.value)}
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        placeholder="Write the answer here. Use a new line to start a new paragraph."
                                    />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddItem}
                            disabled={isLoading || isSaving || items.length >= MAX_ITEMS}
                        >
                            Add Question
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
