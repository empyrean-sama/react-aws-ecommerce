import React, { createContext, useMemo, useState } from "react";
import { SortOrder } from "../../../../helper/SortHelper";
import Fuse from 'fuse.js';

import PanelShell from "./PanelShell";
import { Chip, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Checkbox, Toolbar, IconButton, Tooltip, TextField, InputAdornment, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel } from "@mui/material";

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EditIcon from '@mui/icons-material/Edit';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import StarIcon from '@mui/icons-material/Star';

import ICollectionRecord from "../../../../interface/product/ICollectionRecord";
import { catalogPageContext, ICatalogPageContextAPI } from "./CatalogPage";
import sort from "../../../../helper/SortHelper";
import ProductService from "../../../../service/ProductService";
import ICollection from "../../../../interface/product/ICollection";
import { appGlobalStateContext } from "../../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../../enum/ESnackbarMsgVariant";


export interface ICollectionPanelAPI {
    filterText: string;
    setFilterText: React.Dispatch<React.SetStateAction<string>>;
    order: SortOrder;
    setOrder: React.Dispatch<React.SetStateAction<SortOrder>>;
    orderBy: keyof ICollectionRecord;
    setOrderBy: React.Dispatch<React.SetStateAction<keyof ICollectionRecord>>;

    addModifyCollectionDialogOpen: boolean;
    setAddModifyCollectionDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    collectionIdToModify: string | null;
    setCollectionIdToModify: React.Dispatch<React.SetStateAction<string | null>>;

    addModifyCollectionName: string;
    setAddModifyCollectionName: React.Dispatch<React.SetStateAction<string>>;
    addModifyCollectionDescription: string;
    setAddModifyCollectionDescription: React.Dispatch<React.SetStateAction<string>>;
    addModifyCollectionFavourite: boolean;
    setAddModifyCollectionFavourite: React.Dispatch<React.SetStateAction<boolean>>;
    addModifyCollectionFavouriteStrength: number;
    setAddModifyCollectionFavouriteStrength: React.Dispatch<React.SetStateAction<number>>;

    filteredCollections: ICollectionRecord[];
}
const collectionsPanelContext = createContext<ICollectionPanelAPI | null>(null);

export default function CollectionsPanel() {

    // Global API
    const contextAPI = React.useContext(catalogPageContext) as ICatalogPageContextAPI;

    // Component State
    const [order, setOrder] = useState<SortOrder>("asc");
    const [orderBy, setOrderBy] = useState<keyof ICollectionRecord>("name");
    const [filterText, setFilterText] = useState<string>("");

    const [addModifyCollectionName, setAddModifyCollectionName] = useState<string>("");
    const [addModifyCollectionDescription, setAddModifyCollectionDescription] = useState<string>("");
    const [addModifyCollectionFavourite, setAddModifyCollectionFavourite] = useState<boolean>(false);
    const [addModifyCollectionFavouriteStrength, setAddModifyCollectionFavouriteStrength] = useState<number>(0);

    const [addModifyCollectionDialogOpen, setAddModifyCollectionDialogOpen] = useState<boolean>(false);
    const [collectionIdToModify, setCollectionIdToModify] = useState<string | null>(null);

    // Computed properties
    const filteredCollections: ICollectionRecord[] = useMemo(() => {
        let filteredCollections: ICollectionRecord[] = contextAPI.collections;
        if (filterText.trim()) {
            try {
                const fuse = new Fuse(contextAPI.collections, {
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
                filteredCollections = contextAPI.collections.filter((c) => {
                    const name = (c.name || "").toString().toLowerCase();
                    const id = (c.collectionId || "").toString().toLowerCase();
                    const desc = (c.description || "").toString().toLowerCase();
                    return name.includes(q) || id.includes(q) || desc.includes(q);
                });
            }
        }
        return filteredCollections
    }, [filterText, contextAPI.collections]);

    return (
        <collectionsPanelContext.Provider value={{ filterText, setFilterText, order, setOrder, orderBy, setOrderBy, addModifyCollectionDialogOpen,setAddModifyCollectionDialogOpen, collectionIdToModify, setCollectionIdToModify, filteredCollections, addModifyCollectionName, setAddModifyCollectionName, addModifyCollectionDescription, setAddModifyCollectionDescription, addModifyCollectionFavourite, setAddModifyCollectionFavourite, addModifyCollectionFavouriteStrength, setAddModifyCollectionFavouriteStrength }}>
            <PanelShell flexBasis="25%">
                <Header />
                <Tools  />
                <CollectionPanelCollectionsEnclosure />
            </PanelShell>
            {/* Dialog's Region */}
            <AddModifyCollectionDialog />
        </collectionsPanelContext.Provider>
    );
}

function Header() {

    // Global API
    const catalogPageAPI = React.useContext(catalogPageContext) as ICatalogPageContextAPI;

    return (
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
                <Chip label={`${catalogPageAPI.collections.length} total`} size="small" variant="outlined" />
                <Tooltip title="Hide collections panel">
                    <IconButton size="small" aria-label="hide collections panel" onClick={() => catalogPageAPI.setIsCollapsedPanelOpen(false)}>
                        <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    )
}

function Tools() {

    // Global API
    const catalogPageAPI = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const collectionsPanelAPI = React.useContext(collectionsPanelContext) as ICollectionPanelAPI;
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Handlers
    async function handleAddCollection() {
        collectionsPanelAPI.setAddModifyCollectionDialogOpen(true);
    }

    async function handleDeleteSelectedCollections() {
        if (!window.confirm(`Are you sure you want to delete ${catalogPageAPI.selectedCollections.length} collections?`)) {
            return;
        }
        const productService = ProductService.getInstance();
        try {
            catalogPageAPI.setIsCollectionsPanelLoading(true);
            await Promise.all(catalogPageAPI.selectedCollections.map(id => productService.deleteCollection(id)));
            globalAPI.showMessage("Collections deleted successfully", ESnackbarMsgVariant.success);
            catalogPageAPI.setSelectedCollections([]);
            await catalogPageAPI.reloadCollections();
        } catch (err) {
            console.error(err);
            globalAPI.showMessage("Failed to delete collections", ESnackbarMsgVariant.error);
        } finally {
            catalogPageAPI.setIsCollectionsPanelLoading(false);
        }
    } 

    return (
        <Toolbar variant="regular" sx={{ gap: 1 }}>
            <TextField
                size="small"
                variant="outlined"
                placeholder="Search collections"
                value={collectionsPanelAPI.filterText}
                onChange={(e) => collectionsPanelAPI.setFilterText(e.target.value)}
                sx={{ width: "100%" }}
                slotProps={{input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}}}
            />
            <Tooltip title="Add new collection">
                <IconButton
                    size="small"
                    color="primary"
                    aria-label="add collection"
                    onClick={handleAddCollection}
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
                        onClick={handleDeleteSelectedCollections}
                        disabled={catalogPageAPI.selectedCollections.length === 0}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
        </Toolbar>
    )
}

// Display loading if collections are being loaded
function CollectionPanelCollectionsEnclosure() {
    // Global API
    const catalogPageAPI = React.useContext(catalogPageContext) as ICatalogPageContextAPI;

    // Magic numbers for height calculation
    const magicMaxHeight = "calc(100dvh - 290px)";
    const magicMinHeight = "calc(100dvh - 290px)";

    if(catalogPageAPI.isCollectionsPanelLoading){
        return (
            <Box sx={{display: "flex", justifyContent: "center", alignItems: "center", maxHeight: magicMaxHeight, minHeight: magicMinHeight}}>
                <CircularProgress />
            </Box>
        );
    }
    return (
        <CollectionTable magicMaxHeight={magicMaxHeight} magicMinHeight={magicMinHeight} />
    );
}

// Display the collections table
function CollectionTable({magicMaxHeight, magicMinHeight}: {magicMaxHeight: string, magicMinHeight: string}) {
    
    // Global API
    const catalogPageAPI = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const { filteredCollections, orderBy, order, setOrder, setOrderBy, setAddModifyCollectionDialogOpen, setCollectionIdToModify, setAddModifyCollectionName, setAddModifyCollectionDescription, setAddModifyCollectionFavourite, setAddModifyCollectionFavouriteStrength } = React.useContext(collectionsPanelContext) as ICollectionPanelAPI;
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Computed properties
    const filteredSortedCollectionRecords: ICollectionRecord[] = useMemo(() => {
        return sort(filteredCollections, order, orderBy);
    }, [filteredCollections, order, orderBy]);
    
    // Handlers
    async function handleCollectionClicked(collectionId: string) {
        const selectedIndex = catalogPageAPI.selectedCollections.indexOf(collectionId);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            // The index is not in the selected list, add it
            newSelected = newSelected.concat(catalogPageAPI.selectedCollections, collectionId);
        } else if (selectedIndex === 0) {
            // The first item is selected, remove it
            newSelected = newSelected.concat(catalogPageAPI.selectedCollections.slice(1));
        } else if (selectedIndex === catalogPageAPI.selectedCollections.length - 1) {
            // The last item is selected, remove it
            newSelected = newSelected.concat(catalogPageAPI.selectedCollections.slice(0, -1));
        } else if (selectedIndex > 0) {
            // The item is in the middle, remove it
            newSelected = newSelected.concat(
                catalogPageAPI.selectedCollections.slice(0, selectedIndex),
                catalogPageAPI.selectedCollections.slice(selectedIndex + 1),
            );
        }
        catalogPageAPI.setSelectedCollections(newSelected);
    }

    async function handleToggleFavouriteCollection(e: React.MouseEvent, collection: ICollectionRecord) {
        e.stopPropagation();
        const productService = ProductService.getInstance();
        const newFavouriteStatus = collection.favourite === "true" ? "false" : "true";
        const updatedCollection: ICollection = {
            name: collection.name,
            description: collection.description,
            favourite: newFavouriteStatus,
            favouriteStrength: newFavouriteStatus === "true" ? (collection.favouriteStrength ?? 0) : 0
        };

        try {
            catalogPageAPI.setIsCollectionsPanelLoading(true);
            await productService.updateCollection(collection.collectionId, updatedCollection);
            await catalogPageAPI.reloadCollections();
        } catch (err) {
            console.error(err);
            globalAPI.showMessage("Failed to update collection", ESnackbarMsgVariant.error);
        } finally {
            catalogPageAPI.setIsCollectionsPanelLoading(false);
        }
    }

    async function handleEditCollectionClicked(collectionId: string) {
        const collection = filteredCollections.find(c => c.collectionId === collectionId);
        if (collection) {
            setAddModifyCollectionName(collection.name);
            setAddModifyCollectionDescription(collection.description);
            setAddModifyCollectionFavourite(collection.favourite === "true");
            setAddModifyCollectionFavouriteStrength(collection.favouriteStrength ?? 0);
            setCollectionIdToModify(collectionId);
            setAddModifyCollectionDialogOpen(true);
        }
    }

    // Helpers
    function isSelected(collectionId: string): boolean {
        return catalogPageAPI.selectedCollections.indexOf(collectionId) !== -1;
    }
    
    const Rows = filteredSortedCollectionRecords.map((row) => {
        const isItemSelected = isSelected(row.collectionId);
        const labelId = `collections-table-checkbox-${row.collectionId}`;
        return (
            <TableRow 
                hover
                onClick={() => handleCollectionClicked(row.collectionId)}
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
                <TableCell sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%" }} component="th" id={labelId} scope="row">
                    {row.name}
                </TableCell>
                <TableCell sx={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "96px" }} component="th" id={labelId} scope="row">
                    <Tooltip title={row.favourite === "true" ? "Remove from favourites" : "Add to favourites"}>
                        <IconButton size="small" aria-label="toggle favourite" onClick={(e) => handleToggleFavouriteCollection(e, row)}>
                            {row.favourite === "true" ? <StarIcon fontSize="small" color="warning" /> : <StarOutlineIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit collection">
                        <IconButton size="small" aria-label="edit collection" onClick={(e) => {e.stopPropagation(); handleEditCollectionClicked(row.collectionId)}}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>
        );
    });

    // Handlers
    function handleSelectAllCollectionsClick(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.checked) {
            const newSelects = filteredCollections.map((n) => n.collectionId);
            catalogPageAPI.setSelectedCollections(newSelects);
        }
        else {
            catalogPageAPI.setSelectedCollections([]);
        }
    }

    function handleRequestSort(property: keyof ICollectionRecord) {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    }

    return (
        <TableContainer sx={{ maxHeight: magicMaxHeight, minHeight: magicMinHeight, overflowX: "hidden" }}> {/*TODO: try to get rid of magic numbers in the future */}
            <Table size="small" stickyHeader aria-label="sticky table">
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox">
                            <Checkbox
                                color="primary"
                                indeterminate={catalogPageAPI.selectedCollections.length > 0 && catalogPageAPI.selectedCollections.length < filteredCollections.length}
                                checked={filteredCollections.length > 0 && catalogPageAPI.selectedCollections.length === filteredCollections.length}
                                onChange={handleSelectAllCollectionsClick}
                                slotProps={{input: {"aria-label": "select all collections"}}}
                            />
                        </TableCell>
                        <TableCell sortDirection={orderBy === "name" ? order : false}>
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
                    {Rows}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function AddModifyCollectionDialog() {

    // Global API
    const catalogPageAPI = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const collectionsPanelAPI = React.useContext(collectionsPanelContext) as ICollectionPanelAPI;
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Component State
    

    // Handlers
    async function handleClose() {
        collectionsPanelAPI.setAddModifyCollectionName("");
        collectionsPanelAPI.setAddModifyCollectionDescription("");
        collectionsPanelAPI.setAddModifyCollectionFavourite(false);
        collectionsPanelAPI.setAddModifyCollectionFavouriteStrength(0);
        collectionsPanelAPI.setCollectionIdToModify(null);
        collectionsPanelAPI.setAddModifyCollectionDialogOpen(false);
    }
    
    async function handleConfirm() {
        const productService = ProductService.getInstance();
        const collection: ICollection = {
            name: collectionsPanelAPI.addModifyCollectionName,
            description: collectionsPanelAPI.addModifyCollectionDescription,
            favourite: collectionsPanelAPI.addModifyCollectionFavourite ? "true" : "false",
            favouriteStrength: collectionsPanelAPI.addModifyCollectionFavourite ? (collectionsPanelAPI.addModifyCollectionFavouriteStrength ?? 0) : 0
        };

        try {
            catalogPageAPI.setIsCollectionsPanelLoading(true);
            if (collectionsPanelAPI.collectionIdToModify) {
                // Modify existing collection
                await productService.updateCollection(collectionsPanelAPI.collectionIdToModify, collection);
                globalAPI.showMessage("Collection updated successfully", ESnackbarMsgVariant.success);
            } else {
                // Create new collection
                await productService.createCollection(collection);
                globalAPI.showMessage("Collection created successfully", ESnackbarMsgVariant.success);
            }
            await catalogPageAPI.reloadCollections();
        } catch (err) {
            console.error(err);
            globalAPI.showMessage("Failed to save collection", ESnackbarMsgVariant.error);
        } finally {
            catalogPageAPI.setIsCollectionsPanelLoading(false);
            handleClose();
        }
    }

    return (
        <Dialog
            open={collectionsPanelAPI.addModifyCollectionDialogOpen}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>{collectionsPanelAPI.collectionIdToModify ? "Modify Collection" : "Create New Collection"}</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                <TextField
                    margin="dense"
                    label="Name"
                    fullWidth
                    required
                    value={collectionsPanelAPI.addModifyCollectionName}
                    onChange={(e) => collectionsPanelAPI.setAddModifyCollectionName(e.target.value)}
                    autoFocus
                />
                <TextField
                    margin="dense"
                    label="Description"
                    fullWidth
                    multiline
                    minRows={2}
                    value={collectionsPanelAPI.addModifyCollectionDescription}
                    onChange={(e) => collectionsPanelAPI.setAddModifyCollectionDescription(e.target.value)}
                />
                <Box sx={{ mt: 1 }}>
                    <FormControlLabel
                        control={
                            <Checkbox 
                                icon={<StarOutlineIcon />} 
                                checkedIcon={<StarIcon />} 
                                onChange={(e) => collectionsPanelAPI.setAddModifyCollectionFavourite(e.target.checked)} 
                                checked={collectionsPanelAPI.addModifyCollectionFavourite}
                            />
                        }
                        label="Mark as Favourite"
                    />
                </Box>
                <TextField
                    margin="dense"
                    label="Favourite Strength"
                    type="number"
                    fullWidth
                    value={collectionsPanelAPI.addModifyCollectionFavouriteStrength}
                    onChange={(e) => {
                        const next = Number(e.target.value);
                        collectionsPanelAPI.setAddModifyCollectionFavouriteStrength(Number.isFinite(next) ? next : 0);
                    }}
                    disabled={!collectionsPanelAPI.addModifyCollectionFavourite}
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    color="primary"
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={!collectionsPanelAPI.addModifyCollectionName.trim()}
                >
                    {collectionsPanelAPI.collectionIdToModify ? "Update" : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}