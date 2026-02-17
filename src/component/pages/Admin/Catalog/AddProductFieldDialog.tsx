import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import EProductFieldType from '../../../../enum/EProductFieldType';
import IProductField from '../../../../interface/product/field/IProductField';
import ISectionField from '../../../../interface/product/field/ISectionField';
import ITableField from '../../../../interface/product/field/ITableField';

interface AddProductFieldDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (field: IProductField) => void;
}

export default function AddProductFieldDialog({ open, onClose, onAdd }: AddProductFieldDialogProps) {
    const typeLabelId = 'add-product-field-type-label';
    const typeSelectId = 'add-product-field-type-select';

    const [type, setType] = useState<EProductFieldType>(EProductFieldType.section);
    
    // Section state
    const [sectionTitle, setSectionTitle] = useState('');
    const [sectionDescription, setSectionDescription] = useState('');

    // Table state
    const [tableName, setTableName] = useState('');
    const [tableColumns, setTableColumns] = useState(''); // Comma separated

    const handleAdd = () => {
        if (type === EProductFieldType.section) {
            const field: ISectionField = {
                type: EProductFieldType.section,
                sectionTitle,
                sectionDescription
            };
            onAdd(field);
        } else if (type === EProductFieldType.table) {
            const field: ITableField = {
                type: EProductFieldType.table,
                tableName,
                columns: tableColumns.split(',').map(c => c.trim()).filter(c => c),
                rows: []
            };
            onAdd(field);
        }
        handleClose();
    };

    const handleClose = () => {
        onClose();
        setTimeout(reset, 100); // Reset after animation TODO: remove magic number 100ms
    }

    const reset = () => {
        setType(EProductFieldType.section);
        setSectionTitle('');
        setSectionDescription('');
        setTableName('');
        setTableColumns('');
    }

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Add New Field</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel id={typeLabelId}>Type</InputLabel>
                        <Select
                            labelId={typeLabelId}
                            id={typeSelectId}
                            value={type}
                            label="Type"
                            onChange={(e) => setType(e.target.value as EProductFieldType)}
                        >
                            <MenuItem value={EProductFieldType.section}>Section</MenuItem>
                            <MenuItem value={EProductFieldType.table}>Table</MenuItem>
                        </Select>
                    </FormControl>

                    {type === EProductFieldType.section && (
                        <>
                            <TextField
                                label="Section Title"
                                value={sectionTitle}
                                onChange={(e) => setSectionTitle(e.target.value)}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Section Description"
                                value={sectionDescription}
                                onChange={(e) => setSectionDescription(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                size="small"
                            />
                        </>
                    )}

                    {type === EProductFieldType.table && (
                        <>
                            <TextField
                                label="Table Name"
                                value={tableName}
                                onChange={(e) => setTableName(e.target.value)}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="Columns (comma separated)"
                                value={tableColumns}
                                onChange={(e) => setTableColumns(e.target.value)}
                                fullWidth
                                size="small"
                                helperText="e.g. Size, Color, Quantity"
                            />
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleAdd} variant="contained">Add</Button>
            </DialogActions>
        </Dialog>
    );
}
