import React, { createContext, useMemo, useState, useContext, useEffect } from "react";

import IProductRecord from "../../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../../interface/product/IProductVariantRecord";
import PanelShell from "./PanelShell";
import { Box, Button, Chip, CircularProgress, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Toolbar, Tooltip, Typography, alpha } from "@mui/material";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Fuse from "fuse.js";
import RestoreIcon from '@mui/icons-material/Restore';

import sort, { SortOrder } from "../../../../helper/SortHelper";
import { catalogPageContext, ICatalogPageContextAPI } from "./CatalogPage";
import PickCollection from "./PickCollection";
import IAppGlobalStateContextAPI from "../../../../interface/IAppGlobalStateContextAPI";
import { appGlobalStateContext } from "../../../App/AppGlobalStateProvider";
import useIsMounted from "../../../../hooks/useIsMounted";
import ProductService from "../../../../service/ProductService";
import ESnackbarMsgVariant from "../../../../enum/ESnackbarMsgVariant";

type EditableProduct = IProductRecord & {
    isNew?: boolean;
    isDeleted?: boolean;
    isEdited?: boolean;
};

type EditableVariant = IProductVariantRecord & {
    isNew?: boolean;
    isDeleted?: boolean;
    isEdited?: boolean;
};

type ProductOrderBy = keyof IProductRecord;

interface IItemDetailsPanelContextAPI {
    products: EditableProduct[];
    selectedProductId: string | null;
    setSelectedProductId: React.Dispatch<React.SetStateAction<string | null>>;
    setProducts: React.Dispatch<React.SetStateAction<EditableProduct[]>>;
    visibleProducts: EditableProduct[];
    productFilterText: string;
    setProductFilterText: React.Dispatch<React.SetStateAction<string>>;
    filteredProducts: EditableProduct[];
    variantsByProductId: Record<string, EditableVariant[]>;
    setVariantsByProductId: React.Dispatch<React.SetStateAction<Record<string, EditableVariant[]>>>;

    hasUnsavedChanges: boolean;

    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    isItemListLoading: boolean;
    setIsItemListLoading: React.Dispatch<React.SetStateAction<boolean>>;

    order: SortOrder;
    setOrder: React.Dispatch<React.SetStateAction<SortOrder>>;
    orderBy: ProductOrderBy;
    setOrderBy: React.Dispatch<React.SetStateAction<ProductOrderBy>>;

    selectedImageFile: File | null;
    setSelectedImageFile: React.Dispatch<React.SetStateAction<File | null>>;
    isUploadingImage: boolean;
    setIsUploadingImage: React.Dispatch<React.SetStateAction<boolean>>;
    imageUploadStatus: string;
    setImageUploadStatus: React.Dispatch<React.SetStateAction<string>>;

    handleProductFieldChange: <K extends keyof IProductRecord>(productId: string, field: K, value: IProductRecord[K]) => void;
    markDirty: (productId: string) => void;
    reloadProducts: () => Promise<void>;
}
const itemDetailsPanelContext = createContext<IItemDetailsPanelContextAPI | null>(null);

export default function ProductDetailsPanel() {

    // Global API
    const { selectedCollections } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const globalAPI = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const productService = ProductService.getInstance();
    const isMounted = useIsMounted();

    // State
    const [products, setProducts] = useState<EditableProduct[]>([]);
    const [variantsByProductId, setVariantsByProductId] = useState<Record<string, EditableVariant[]>>({});
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [productFilterText, setProductFilterText] = useState<string>("");

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
    const [imageUploadStatus, setImageUploadStatus] = useState<string>("");

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isItemListLoading, setIsItemListLoading] = useState<boolean>(false);

    const [order, setOrder] = useState<SortOrder>("asc");
    const [orderBy, setOrderBy] = useState<ProductOrderBy>("name");

    // Computed Properties
    const visibleProducts = useMemo(() => products,[products]);
    const hasUnsavedChanges = useMemo(() => products.some(p => p.isEdited || p.isNew || p.isDeleted), [products]);
    const filteredProducts = useMemo(() => {
        let list = visibleProducts;
        const query = productFilterText.trim();
        if (query) {
            try {
                const fuse = new Fuse(visibleProducts, {
                    keys: [
                        { name: "name", weight: 0.7 },
                        { name: "productId", weight: 0.2 },
                        { name: "description", weight: 0.1 },
                    ],
                    threshold: 0.4,
                    ignoreLocation: true,
                    minMatchCharLength: 1,
                });
                const results = fuse.search(query);
                list = results.map((r) => r.item);
            } catch {
                const q = query.toLowerCase();
                list = visibleProducts.filter((p) => {
                    const name = (p.name || "").toString().toLowerCase();
                    const id = (p.productId || "").toString().toLowerCase();
                    const desc = (p.description || "").toString().toLowerCase();
                    return name.includes(q) || id.includes(q) || desc.includes(q);
                });
            }
        }
        return list;
    }, [visibleProducts, productFilterText]);

    // Effects
    useEffect(() => {
        reloadProducts();
    }, [selectedCollections, globalAPI]);

    // Private methods
    function handleProductFieldChange<K extends keyof IProductRecord>(productId: string, field: K, value: IProductRecord[K]) {
        setProducts((prev) => prev.map((p) => p.productId === productId ? { ...p, [field]: value } : p));
        markDirty(productId);
    }

    function markDirty(productId: string) {
        // Mark the product as edited
        setProducts((prev) => prev.map((p) => p.productId === productId ? { ...p, isEdited: true } : p));
    }

    function resetImagePicker() {
        if(isMounted.current) {   
            setSelectedImageFile(null);
            setImageUploadStatus("");
            setIsUploadingImage(false);
        }
    }

    function resetItemPanelState() {
        if(isMounted.current) {   
            resetImagePicker();
            
            setProducts([]);
            setVariantsByProductId({});
        }
    }

    async function reloadProducts() {
        if(isMounted.current) {
            resetItemPanelState();
            setIsLoading(true);
        }
    
        try {
            const productRecords: EditableProduct[] = [];
            const seen = new Set<string>(); // This is basically to avoid duplicate products when multiple collections are selected (should not happen according to our data model but just in case)
            
            // Batch requests to avoid hitting rate limits or browser connection limits
            const BATCH_SIZE = 5;
            for (let i = 0; i < selectedCollections.length; i += BATCH_SIZE) {
                const batch = selectedCollections.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(batch.map((id) => productService.getProductsByCollectionId(id)));
                
                for (const arr of results) {
                    for (const p of arr ?? []) {
                        if (!seen.has(p.productId)) {
                            seen.add(p.productId);
                            productRecords.push({ ...p });
                        }
                    }
                }
            }

            if (isMounted.current) {
                // Set the products to view and select the first product by default
                setProducts(productRecords);
                if (productRecords.length > 0 && !selectedProductId) {
                    setSelectedProductId(productRecords[0].productId);
                }
            }
        }
        catch (error) {
            console.error("Failed to load products", error);
            globalAPI.showMessage("Failed to load items for selected collections", ESnackbarMsgVariant.error);
        }
        finally {
            if (isMounted) {
                setIsLoading(false);
            }
        }
    }

    return (
        <PanelShell flexBasis='75%'>
            <itemDetailsPanelContext.Provider value={{ products, setProducts, selectedProductId, setSelectedProductId, visibleProducts, productFilterText, setProductFilterText, filteredProducts, hasUnsavedChanges, isLoading, setIsLoading, isItemListLoading, setIsItemListLoading, order, setOrder, orderBy, setOrderBy, markDirty, handleProductFieldChange, selectedImageFile, setSelectedImageFile, isUploadingImage, setIsUploadingImage, imageUploadStatus, setImageUploadStatus, variantsByProductId, setVariantsByProductId, reloadProducts }}>
                <ProductDetailsPanelLoadingEnclosure />
            </itemDetailsPanelContext.Provider>    
        </PanelShell>
    );
}

function ProductDetailsPanelLoadingEnclosure() {
    const { isLoading } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress />
            </Box>
        );
    }
    return (
        <>
            <Header />
            <ProductDetails />
            <ProductActionPane />
        </>
    );
}

function Header() {

    // Global API
    const { visibleProducts, hasUnsavedChanges } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="h5">Product Details</Typography>
                <Typography variant="body2" color="text.secondary">Product's are filtered by the collections selected.</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                    label={`${visibleProducts.length} items`}
                    size="small"
                    variant="outlined"
                />
                {hasUnsavedChanges && (
                    <Chip
                        color="warning"
                        label="Unsaved changes"
                        size="small"
                        variant="outlined"
                    />
                )}
            </Box>
        </Box>
    )
}

function ProductDetails() {
    return (
        <Box sx={{flex: "1 1 100%", display: "flex"}}>
            <PanelGroup direction="horizontal">
                <SelectProductPane />
                <PanelResizeHandle>
                    <Box sx={{ width: "1px", height: "100%", cursor: "col-resize", bgcolor: (theme) => theme.palette.divider}} />
                </PanelResizeHandle>
                <ProductInspectorPane />
            </PanelGroup>
        </Box>
    );
}

function SelectProductPane() {
    
    // Global API
    const { itemDetailsPanelResizePaneLocationPercentage, setItemDetailsPanelResizePaneLocationPercentage } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const { productFilterText, setProductFilterText } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

    return (
        <Panel defaultSize={itemDetailsPanelResizePaneLocationPercentage} onResize={(size) => setItemDetailsPanelResizePaneLocationPercentage(size)}>
            <SelectProductToolbar />
            <SelectProductList />
        </Panel>
    );
}

function SelectProductToolbar() {

    // Global API
    const { productFilterText, setProductFilterText, setProducts, setSelectedProductId } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;
    const { selectedCollections } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    
    // Handlers
    async function handleAddProduct() {
        const newProductId = `new-${crypto.randomUUID()}`;
        const newProduct: EditableProduct = {
            productId: newProductId,
            collectionId: selectedCollections[0] || "",
            name: "New Product",
            description: "",
            fields: [],
            imageUrls: [],
            isNew: true,
            isEdited: true
        };
        setProducts(prev => [newProduct, ...prev]);
        setSelectedProductId(newProductId);
    }

    return (
        <Toolbar variant="dense" sx={{ gap: 1, px: 2, py: 1 }}>
            <TextField
                placeholder="Filter products"
                variant="outlined"
                size="small"
                value={productFilterText}
                onChange={(e) => setProductFilterText(e.target.value)}
                sx={{ ml: 1, flexGrow: 1 }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            productFilterText && <IconButton onClick={() => setProductFilterText("")}>
                                <Close fontSize="small" />
                            </IconButton>
                        )
                    },
                }}
            />
            <Tooltip title="Add new item">
                <IconButton
                    size="small"
                    color="primary"
                    aria-label="add item"
                    onClick={handleAddProduct}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Toolbar>
    )
}

function SelectProductList() {

    // Global API
    const { collections } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const { isItemListLoading, productFilterText, filteredProducts, selectedProductId, setSelectedProductId, order, orderBy, setOrder, setOrderBy, handleProductFieldChange, setProducts, products } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

    // Computed Properties
    const filteredSortedProducts = sort(filteredProducts, order, orderBy)
    const rows = filteredSortedProducts.map((product) => {
        const isSelected = product.productId === selectedProductId;
        const isDeleted = !!product.isDeleted;
        const isNew = !!product.isNew;
        return(
            <TableRow 
                hover 
                key={product.productId} 
                selected={isSelected} 
                onClick={() => handleSelectProduct(product.productId)} 
                sx={{ 
                    cursor: "pointer", 
                    opacity: isDeleted ? 0.5 : 1,
                    backgroundColor: isNew ? (theme) => alpha(theme.palette.info.main, 0.1) : 'inherit',
                    '&.Mui-selected': {
                        backgroundColor: isNew ? (theme) => alpha(theme.palette.info.main, 0.2) : undefined,
                    }
                }}
            >
                <TableCell>
                    <TextField value={product.name} onChange={(e) => handleProductFieldChange(product.productId,"name", e.target.value)} variant="standard" size="small" disabled={isDeleted}/>
                </TableCell>
                <TableCell>
                    <PickCollection currentCollectionId={product.collectionId} collections={collections}
                        onCollectionPick={(collectionId: string) =>
                            handleProductFieldChange(product.productId, "collectionId", collectionId)
                        }
                        disabled={isDeleted}
                    />
                </TableCell>
                <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip title="Undo changes">
                            <span>
                                <IconButton size="small" color="primary" aria-label="undo changes" disabled={product.isNew || (!product.isEdited && !product.isDeleted)} onClick={(e) => { e.stopPropagation(); handleUndoProduct(product.productId); }}>
                                    <RestoreIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Delete item">
                            <span>
                                <IconButton size="small" color="error" aria-label="delete item" disabled={product.isDeleted} onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.productId); }}>
                                    <DeleteIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </TableCell>
            </TableRow>
        );
    });

    // Handlers
    function handleRequestSort(property: ProductOrderBy) {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    function handleSelectProduct(productId: string) {
        setSelectedProductId(productId);
    }

    function handleDeleteProduct(productId: string) {
        setProducts(prev => prev.map(p => p.productId === productId ? { ...p, isDeleted: true } : p));
    }

    async function handleUndoProduct(productId: string) {
        const product = products.find(p => p.productId === productId);
        if (!product) {
            return;
        }

        if (product.isDeleted && !product.isEdited) {
            setProducts(prev => prev.map(p => p.productId === productId ? { ...p, isDeleted: false } : p));
            return;
        }

        const productService = ProductService.getInstance();
        try {
            const original = await productService.getProductById(productId);
            if (original) {
                setProducts(prev => prev.map(p => p.productId === productId ? { ...original, isEdited: false, isDeleted: false, isNew: false } : p));
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Rendering List
    if(isItemListLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress />
            </Box>
        );
    }
    else {
        return (
            <Box sx={{ overflowY: "auto", height: "calc(100% - 56px)" }}> {/** TODO: remove the magic number 56 */}
                <TableContainer component={Paper} elevation={0}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sortDirection={orderBy === "name" ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === "name"}
                                        direction={orderBy === "name" ? order : "asc"}
                                        onClick={() => handleRequestSort("name")}
                                    >
                                        Name
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center">Collection</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> 
                            {rows}
                            {filteredProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                        {productFilterText.trim()
                                            ? "No items match the search"
                                            : "No items for selected collections"}
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        );
    }
}

function ProductInspectorPane() {
    const { itemDetailsPanelResizePaneLocationPercentage } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    return (
        <Panel defaultSize={100 - itemDetailsPanelResizePaneLocationPercentage}>
            <h1>Product Inspector Pane</h1>
        </Panel>
    );
}

function ProductActionPane() {

    // Global API
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const { hasUnsavedChanges, isLoading, setIsLoading, products, reloadProducts } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;
    const productService = ProductService.getInstance();

    // Handlers
    async function handleCancel() {
        await reloadProducts();
    }

    async function handleOk() {
        setIsLoading(true);
        try {
            const promises: Promise<any>[] = [];
            for (const product of products) {
                if (product.isNew) {
                    if (!product.isDeleted) {
                         promises.push(productService.createProduct(product));
                    }
                } else if (product.isDeleted) {
                    promises.push(productService.deleteProduct(product.productId));
                } else if (product.isEdited) {
                    promises.push(productService.updateProduct(product.productId, product));
                }
            }
            await Promise.allSettled(promises);
            await reloadProducts();
        } catch (error) {
            console.error("Failed to save one or more changes", error); //TODO: maybe we can undo all changes if one fails (might require backend support)
            globalAPI.showMessage("Failed to save one or more changes", ESnackbarMsgVariant.error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
         <Box
            sx={{
                borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: (theme) => theme.palette.background.paper,
                px: 2,
                py: 1,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                zIndex: 1,
            }}
        >
            <Button variant="outlined" onClick={handleCancel} disabled={isLoading}>Cancel</Button>
            <Button variant="contained" onClick={handleOk} disabled={isLoading || !hasUnsavedChanges}>OK</Button>
        </Box>
    );
}