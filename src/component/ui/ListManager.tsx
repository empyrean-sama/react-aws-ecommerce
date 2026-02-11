import React, { useEffect } from 'react';
import UtilityService from '../../service/UtilityService';
import { appGlobalStateContext } from '../App/AppGlobalStateProvider';
import IAppGlobalStateContextAPI from '../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../enum/ESnackbarMsgVariant';

import { Paper, Toolbar, LinearProgress, Box, Button, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, IconButton, Typography, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Checkbox, MenuItem } from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import { IAllowableValue } from '../../interface/IAllowableValue';

enum EListItemType {
    string = "string",
    number = "number",
    boolean = "boolean",
    date = "date",
    picture = "picture",
    list = "list",
}
export { EListItemType };

export interface IListItem {
    type: EListItemType;
    name: string;
    allowableValues?: IAllowableValue[];
    readonly?: boolean;
}

export interface ListManagerProps {
    memoryKey: string;
    fileSchema: IListItem[];
    maxItems: number;
}

export default function ListManager(props: ListManagerProps) {

    // Global API
    const utilityService = UtilityService.getInstance();
    const appGlobalState = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI | null;
    
    // Component state
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [list, setList] = React.useState<Record<string, any>[]>([]);
    const [savedList, setSavedList] = React.useState<Record<string, any>[]>([]);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = React.useState<boolean>(false);

    const isDirty = React.useMemo(() => JSON.stringify(list) !== JSON.stringify(savedList), [list, savedList]);

    // Effects
    useEffect(() => {
        (async () => {
            try {
                const fetchedList = await utilityService.getList(props.memoryKey);
                setList(fetchedList);
                setSavedList(fetchedList);
            }
            catch { }
            finally {
                setIsLoading(false);
            }
        })();
    }, [props.memoryKey]);

    // Private routines
    async function handleSaveList() {
        setIsLoading(true);
        try {
            await utilityService.saveList(props.memoryKey, list);
            setSavedList(list);
        }
        finally {
            setIsLoading(false);
        }
    }

    async function handleClearList() {
        setIsLoading(true);
        const previousList = list;
        setList([]);
        try {
            await utilityService.saveList(props.memoryKey, []);
            setSavedList([]);
        }
        catch {
            setList(previousList);
        }
        finally {
            setIsLoading(false);
        }
    }

    function handleOpenClearConfirm() {
        setIsClearConfirmOpen(true);
    }

    function handleCloseClearConfirm() {
        setIsClearConfirmOpen(false);
    }

    async function handleConfirmClearList() {
        setIsClearConfirmOpen(false);
        await handleClearList();
    }

    async function handleDeleteRow(index: number) {
        setList(prev => prev.filter((_, i) => i !== index));
    }

    function handleMoveRow(index: number, direction: 'up' | 'down') {
        setList(prev => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) {
                return prev;
            }

            const newList = [...prev];
            const [moved] = newList.splice(index, 1);
            newList.splice(newIndex, 0, moved);
            return newList;
        });
    }

    async function handleAddRow() {
        if (list.length >= props.maxItems) {
            appGlobalState?.showMessage?.(`You have reached the maximum of ${props.maxItems} items.`, ESnackbarMsgVariant.warning);
            return;
        }

        setList(prev => {
            if (prev.length >= props.maxItems) {
                return prev;
            }

            const newRow = props.fileSchema.reduce<Record<string, any>>((acc, item) => {
                switch (item.type) {
                    case EListItemType.number:
                        acc[item.name] = 0;
                        break;
                    case EListItemType.boolean:
                        acc[item.name] = false;
                        break;
                    case EListItemType.date:
                        acc[item.name] = '';
                        break;
                    case EListItemType.picture:
                        acc[item.name] = '';
                        break;
                    case EListItemType.list:
                        acc[item.name] = item.allowableValues?.[0]?.key ?? '';
                        break;
                    case EListItemType.string:
                    default:
                        acc[item.name] = '';
                        break;
                }
                return acc;
            }, {});

            return [...prev, newRow];
        });
    }

    function renderInputField(listItem: IListItem, value: any, onChange: (newValue: any) => void) {
        const isReadOnly = !!listItem.readonly;
        switch (listItem.type) {
            case EListItemType.string:
                return (
                    <TextField 
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        variant="outlined"
                        size="small"
                        slotProps={{ input: { readOnly: isReadOnly } }}
                    />
                );
            case EListItemType.number:
                return (
                    <TextField
                        type="number"
                        value={value || ''}
                        onChange={(e) => onChange(Number(e.target.value))}
                        variant="outlined"
                        size="small"
                        slotProps={{ input: { readOnly: isReadOnly } }}
                    />
                );
            case EListItemType.picture:
                return (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <Button variant="outlined" component="label" size="small" disabled={isReadOnly}>
                            Choose File
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                disabled={isReadOnly}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) {
                                        return;
                                    }

                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        onChange(reader.result ?? '');
                                    };
                                    reader.readAsDataURL(file);

                                    e.target.value = '';
                                }}
                            />
                        </Button>
                        {value ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box
                                    component="img"
                                    src={typeof value === 'string' ? value : ''}
                                    alt="Selected"
                                    sx={{ width: 128, borderRadius: 1, objectFit: "cover", border: "1px solid", borderColor: "divider" }}
                                />
                            </Box>
                        ) : (
                            <Typography variant="caption" color="text.secondary">No file</Typography>
                        )}
                    </Box>
                );
            case EListItemType.boolean:
                return (
                    <Checkbox 
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        size="small"
                        disabled={isReadOnly}
                    />
                );
            case EListItemType.date:
                return (
                    <TextField
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        variant="outlined"
                        size="small"
                        slotProps={{ input: { readOnly: isReadOnly } }}
                    />
                );
            case EListItemType.list:
                return (
                    <TextField
                        select
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ minWidth: 160 }}
                        disabled={isReadOnly}
                    >
                        {(listItem.allowableValues ?? []).map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                                {option.displayValue}
                            </MenuItem>
                        ))}
                    </TextField>
                );
            default:
                return <Typography variant="body2" color="text.secondary">Unsupported type</Typography>;
        }
    }
    
    return (
        <Paper>
            <Toolbar sx={{ gap: 2, justifyContent: "flex-end" }}>
                {isLoading && <LinearProgress  variant="indeterminate" sx={{ display: "flex-item", flexGrow: 1 }} />}
                <Box>
                    <Button variant="contained" onClick={handleSaveList} startIcon={<SaveIcon />} disabled={!isDirty}>Save List</Button>
                    <Button variant="contained" color='success' onClick={handleAddRow} startIcon={<AddIcon />}>Add Item</Button>
                    <Button variant="contained" color="error" onClick={handleOpenClearConfirm} startIcon={<DeleteIcon />} disabled={!isDirty}>Clear List</Button>
                </Box>
            </Toolbar>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                S.No.
                            </TableCell>
                                {props.fileSchema.map((item) => (
                                    <TableCell key={item.name} align='center'>{item.name}</TableCell>
                                ))}
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {list.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={Math.max(1, props.fileSchema.length + 2)}>
                                    <Typography variant="body2" color="text.secondary">No items in the list. Click 'Add Item' to add new items.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            list.map((listItem, index) => (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}.</TableCell>
                                    {props.fileSchema.map((item) => (
                                        <TableCell key={`${index}-${item.name}`} align="center">
                                            {renderInputField(item, listItem[item.name], (value) => setList(prev => {
                                                const newList = [...prev];
                                                newList[index] = { ...newList[index], [item.name]: value };
                                                return newList;
                                            }))}
                                        </TableCell>
                                    ))}
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => handleMoveRow(index, 'up')}
                                            aria-label="Move row up"
                                            disabled={index === 0}
                                        >
                                            <ArrowUpwardIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleMoveRow(index, 'down')}
                                            aria-label="Move row down"
                                            disabled={index === list.length - 1}
                                        >
                                            <ArrowDownwardIcon />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteRow(index)} aria-label="Delete row">
                                            <DeleteIcon />
                                        </IconButton>
                                        
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog
                open={isClearConfirmOpen}
                onClose={handleCloseClearConfirm}
                aria-labelledby="clear-list-dialog-title"
                aria-describedby="clear-list-dialog-description"
            >
                <DialogTitle id="clear-list-dialog-title">Clear list?</DialogTitle>
                <DialogContent>
                    <DialogContentText id="clear-list-dialog-description">
                        This will remove all items from the list. This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseClearConfirm}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleConfirmClearList}>Clear</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}