import React, { useContext, useEffect, useMemo, useState } from "react";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import ProductService from "../../../service/ProductService";

import PanelShell from "./PanelShell";
import { Chip, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Checkbox, Toolbar, IconButton, Tooltip, TextField, InputAdornment, CircularProgress } from "@mui/material";
import SearchBar from "../../ui/SearchBar";

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import Fuse from 'fuse.js';

import { getComparator, Order, stableSort } from "./AdminConsoleHelper";

import ICollectionRecord from "../../../interface/product/ICollectionRecord";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

const headCells: { id: keyof ICollectionRecord; label: string }[] = [
    { id: "collectionId", label: "ID" },
    { id: "name", label: "Name" }
];

export interface CollectionsPanelProps {
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function CollectionsPanel(props: CollectionsPanelProps) {

    // State variables
    const [collections, setCollections] = useState<Array<ICollectionRecord>>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<keyof ICollectionRecord>("name");
    
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterText, setFilterText] = useState<string>("");

    // Global State
    const globalAPI = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Effects
    useEffect(() => {
        let isMounted = true;
        (async function() {
            try {
                setIsLoading(true);
                const result = await ProductService.getInstance().listCollections();
                if (isMounted) {
                    setCollections(result ?? []);
                }
            } catch (error) {
                console.error("Failed to load collections", error);
                globalAPI.showMessage("Failed to load collections", ESnackbarMsgVariant.error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    // Computed properties
    const filteredCollections: ICollectionRecord[] = useMemo(() => {
        let filteredCollections: ICollectionRecord[] = collections;
        if (filterText.trim()) {
            try {
                const fuse = new Fuse(collections, {
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
                filteredCollections = collections.filter((c) => {
                    const name = (c.name || "").toString().toLowerCase();
                    const id = (c.collectionId || "").toString().toLowerCase();
                    const desc = (c.description || "").toString().toLowerCase();
                    return name.includes(q) || id.includes(q) || desc.includes(q);
                });
            }
        }
        return filteredCollections;
    }, [filterText, collections]);

    // Handlers
    function handleRequestSort(property: keyof ICollectionRecord) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    function handleSelectAllClick(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.checked) {
            const newSelected = filteredCollections.map((n) => n.collectionId);
            props.setSelected(newSelected);
        } else {
            props.setSelected([]);
        }
    };

    function handleClick(id: string) {
        const selectedIndex = props.selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            // selecting a new item
            newSelected = newSelected.concat(props.selected, id);
        } else {
            // deselecting an item
            newSelected = props.selected.filter((selectedId) => selectedId !== id);
        }
        props.setSelected(newSelected);
    };

    // Given an ID, return whether it is selected
    const isSelected = (id: string) => props.selected.indexOf(id) !== -1;

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <PanelShell>
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
                <Chip label={`${collections.length} total`} size="small" variant="outlined" />
            </Box>

            <Box>
                <Paper elevation={0}>
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
                            <IconButton size="small" color="primary" aria-label="add collection" onClick={() => console.log('add collection clicked')}>
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete selected collections">
                            <span>
                                <IconButton size="small" color="error" aria-label="delete selected" onClick={() => console.log('delete selected clicked')} disabled={props.selected.length === 0}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Toolbar>
                    {isLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    indeterminate={
                                                        props.selected.length > 0 && props.selected.length < filteredCollections.length
                                                    }
                                                    checked={filteredCollections.length > 0 && props.selected.length === filteredCollections.length}
                                                    onChange={handleSelectAllClick}
                                                    slotProps={{input: {"aria-label": "select all collections"}}}
                                                />
                                            </TableCell>
                                            {headCells.map((headCell) => (
                                                <TableCell
                                                    key={String(headCell.id)}
                                                    sortDirection={orderBy === headCell.id ? order : false}
                                                >
                                                    <TableSortLabel
                                                        active={orderBy === headCell.id}
                                                        direction={orderBy === headCell.id ? order : "asc"}
                                                        onClick={() => handleRequestSort(headCell.id)}
                                                    >
                                                        {headCell.label}
                                                    </TableSortLabel>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stableSort(filteredCollections, getComparator(order, orderBy))
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
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
                                                        <TableCell>{row.collectionId}</TableCell>
                                                        <TableCell component="th" id={labelId} scope="row">{row.name}</TableCell>
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
                            <TablePagination
                                rowsPerPageOptions={[5, 10]}
                                labelRowsPerPage="Collections on page:"
                                component="div"
                                count={filteredCollections.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </>
                    )}
                </Paper>
            </Box>
        </PanelShell>
    );
}