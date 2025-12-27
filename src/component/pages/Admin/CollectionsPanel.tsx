import React, { useMemo, useState } from "react";

import PanelShell from "./PanelShell";
import { Chip, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Checkbox, Toolbar, IconButton, Tooltip, TextField, InputAdornment, CircularProgress } from "@mui/material";

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

import Fuse from 'fuse.js';

import { getComparator, Order, stableSort } from "./AdminConsoleHelper";

import ICollectionRecord from "../../../interface/product/ICollectionRecord";

const headCells: { id: keyof ICollectionRecord; label: string }[] = [
    { id: "collectionId", label: "ID" },
    { id: "name", label: "Name" }
];

export interface CollectionsPanelProps {
    selectedCollections: string[];
    setSelectedCollections: React.Dispatch<React.SetStateAction<string[]>>;
    collections: ICollectionRecord[];
    isLoading: boolean;
    onAddCollection: () => void;
    onDeleteSelectedCollections: () => void;
    onClosePanel: () => void;
}

export default function CollectionsPanel(props: CollectionsPanelProps) {

    // State variables
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<keyof ICollectionRecord>("name");

    const [filterText, setFilterText] = useState<string>("");

    // Computed properties
    const filteredCollections: ICollectionRecord[] = useMemo(() => {
        let filteredCollections: ICollectionRecord[] = props.collections;
        if (filterText.trim()) {
            try {
                const fuse = new Fuse(props.collections, {
                    keys: [
                        { name: 'name', weight: 0.7 },
                        { name: 'collectionId', weight: 0.2 },
                        { name: 'description', weight: 0.1 },
                    ],
                    threshold: 0.4,
                    ignoreLocation: true,
                    minMatchCharLength: 1,
                });
                const results = fuse.search(filterText.trim());
                filteredCollections = results.map((r) => r.item);
            } catch (err) {
                // fallback to simple filter on error
                const q = filterText.trim().toLowerCase();
                filteredCollections = props.collections.filter((c) => {
                    const name = (c.name || "").toString().toLowerCase();
                    const id = (c.collectionId || "").toString().toLowerCase();
                    const desc = (c.description || "").toString().toLowerCase();
                    return name.includes(q) || id.includes(q) || desc.includes(q);
                });
            }
        }
        return filteredCollections;
    }, [filterText, props.collections]);

    // Handlers
    function handleRequestSort(property: keyof ICollectionRecord) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    function handleSelectAllClick(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.checked) {
            const newSelected = filteredCollections.map((n) => n.collectionId);
            props.setSelectedCollections(newSelected);
        } else {
            props.setSelectedCollections([]);
        }
    };

    function handleClick(id: string) {
        const selectedIndex = props.selectedCollections.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            // selecting a new item
            newSelected = newSelected.concat(props.selectedCollections, id);
        } else {
            // deselecting an item
            newSelected = props.selectedCollections.filter((selectedId) => selectedId !== id);
        }
        props.setSelectedCollections(newSelected);
    };

    // Given an ID, return whether it is selected
    const isSelected = (id: string) => props.selectedCollections.indexOf(id) !== -1;
    return (
        <PanelShell flexBasis="25%">
            <Box
                sx={{
                    px: 3,
                    py: 2,
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                }}
            >
                <Typography variant="h5">Collections</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip label={`${props.collections.length} total`} size="small" variant="outlined" />
                    <Tooltip title="Hide collections panel">
                        <IconButton
                            size="small"
                            aria-label="hide collections panel"
                            onClick={props.onClosePanel}
                        >
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Toolbar variant="regular" sx={{ gap: 1 }}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search collections"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    sx={{ width: "100%" }}
                    slotProps={{input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}}}
                />
                <Tooltip title="Add new collection">
                    <IconButton
                        size="small"
                        color="primary"
                        aria-label="add collection"
                        onClick={props.onAddCollection}
                    >
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete selected collections">
                    <span>
                        <IconButton
                            size="small"
                            color="error"
                            aria-label="delete selected"
                            onClick={props.onDeleteSelectedCollections}
                            disabled={props.selectedCollections.length === 0}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Toolbar>

            <Box>
                <Paper elevation={0}>
                    {props.isLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <TableContainer sx={{ maxHeight: 'calc(100dvh - 256px)', minHeight: 'calc(100dvh - 256px)', overflowX: "hidden" }}> {/*TODO: try to get rid of magic numbers in the future */}
                                <Table size="small" stickyHeader aria-label="sticky table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    indeterminate={
                                                        props.selectedCollections.length > 0 && props.selectedCollections.length < filteredCollections.length
                                                    }
                                                    checked={filteredCollections.length > 0 && props.selectedCollections.length === filteredCollections.length}
                                                    onChange={handleSelectAllClick}
                                                    slotProps={{input: {"aria-label": "select all collections"}}}
                                                />
                                            </TableCell>
                                            <TableCell
                                                sortDirection={orderBy === "collectionId" ? order : false}
                                                sx={{textAlign: 'center'}}
                                            >
                                                <TableSortLabel
                                                    active={orderBy === "collectionId"}
                                                    direction={orderBy === "collectionId" ? order : "asc"}
                                                    onClick={() => handleRequestSort("collectionId")}
                                                >
                                                    Id
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell
                                                sortDirection={orderBy === "name" ? order : false}
                                            >
                                                <TableSortLabel
                                                    active={orderBy === "name"}
                                                    direction={orderBy === "name" ? order : "asc"}
                                                    onClick={() => handleRequestSort("name")}
                                                >
                                                    Name
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stableSort(filteredCollections, getComparator(order, orderBy))
                                            .map((row) => {
                                                const isItemSelected = isSelected(row.collectionId);
                                                const labelId = `collections-table-checkbox-${row.collectionId}`;

                                                return (
                                                    <TableRow
                                                        hover
                                                        onClick={() => handleClick(row.collectionId)}
                                                        role="checkbox"
                                                        aria-checked={isItemSelected}
                                                        tabIndex={-1}
                                                        key={row.collectionId}
                                                        selected={isItemSelected}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                color="primary"
                                                                checked={isItemSelected}
                                                                slotProps={{input: {"aria-labelledby": labelId}}}
                                                            />
                                                        </TableCell>
                                                        <TableCell 
                                                            sx={{ 
                                                                maxWidth: "65px", 
                                                                textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            <Tooltip title={row.collectionId}>
                                                                <span>{row.collectionId}</span>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell 
                                                            sx={{
                                                                textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
                                                                maxWidth: "200px"
                                                            }} 
                                                            component="th" 
                                                            id={labelId} 
                                                            scope="row"
                                                        >
                                                            {row.name}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        {filteredCollections.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">No collections to display</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            </Box>
        </PanelShell>
    );
}