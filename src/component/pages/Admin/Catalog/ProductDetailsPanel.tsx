import React, { createContext, useMemo, useState, useContext, useEffect } from "react";

import IProductRecord from "../../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../../interface/product/IProductVariantRecord";
import PanelShell from "./PanelShell";
import { Box, Button, Chip, CircularProgress, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Toolbar, Tooltip, Typography, alpha, LinearProgress } from "@mui/material";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Fuse from "fuse.js";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import CryptoJS from 'crypto-js';
import OutputParser from "../../../../service/OutputParser";
import Constants from "../../../../infrastructure/InfrastructureConstants";

import sort, { SortOrder } from "../../../../helper/SortHelper";
import { catalogPageContext, ICatalogPageContextAPI } from "./CatalogPage";
import PickCollection from "./PickCollection";
import IAppGlobalStateContextAPI from "../../../../interface/IAppGlobalStateContextAPI";
import { appGlobalStateContext } from "../../../App/AppGlobalStateProvider";
import useIsMounted from "../../../../hooks/useIsMounted";
import ProductService from "../../../../service/ProductService";
import ESnackbarMsgVariant from "../../../../enum/ESnackbarMsgVariant";
import AddProductFieldDialog from "./AddProductFieldDialog";
import IProductField from "../../../../interface/product/field/IProductField";
import ISectionField from "../../../../interface/product/field/ISectionField";
import ITableField from "../../../../interface/product/field/ITableField";
import EProductFieldType from "../../../../enum/EProductFieldType";

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
    isVariantTableLoading: boolean;
    setIsVariantTableLoading: React.Dispatch<React.SetStateAction<boolean>>;

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
    handleUndoProduct: (productId: string) => Promise<void>;
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
    const [isVariantTableLoading, setIsVariantTableLoading] = useState<boolean>(false);

    const [order, setOrder] = useState<SortOrder>("asc");
    const [orderBy, setOrderBy] = useState<ProductOrderBy>("name");

    // Computed Properties
    const visibleProducts = useMemo(() => products,[products]);
    const hasUnsavedChanges = useMemo(() => {
        const productsChanged = products.some(p => p.isEdited || p.isNew || p.isDeleted);
        const variantsChanged = Object.values(variantsByProductId).some(variants => variants.some(v => v.isEdited || v.isNew || v.isDeleted));
        return productsChanged || variantsChanged;
    }, [products, variantsByProductId]);
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

    return (
        <PanelShell flexBasis='75%'>
            <itemDetailsPanelContext.Provider value={{ products, setProducts, selectedProductId, setSelectedProductId, visibleProducts, productFilterText, setProductFilterText, filteredProducts, hasUnsavedChanges, isLoading, setIsLoading, isItemListLoading, setIsItemListLoading, isVariantTableLoading, setIsVariantTableLoading, order, setOrder, orderBy, setOrderBy, markDirty, handleProductFieldChange, selectedImageFile, setSelectedImageFile, isUploadingImage, setIsUploadingImage, imageUploadStatus, setImageUploadStatus, variantsByProductId, setVariantsByProductId, reloadProducts, handleUndoProduct }}>
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

interface IProductDetailsContextAPI {
    magicMinPaneHeight: string;
    magicMaxPaneHeight: string;
}
const productDetailsContext = createContext<IProductDetailsContextAPI | null>(null);

function ProductDetails() {
    return (
        <productDetailsContext.Provider value={{ magicMinPaneHeight: "calc(100dvh - 350px)", magicMaxPaneHeight: "calc(100dvh - 294px)" }}>
            <Box sx={{flex: "1 1 100%", display: "flex"}}>
                <PanelGroup direction="horizontal">
                    <SelectProductPane />
                    <PanelResizeHandle>
                        <Box sx={{ width: "1px", height: "100%", cursor: "col-resize", bgcolor: (theme) => theme.palette.divider}} />
                    </PanelResizeHandle>
                    <ProductInspectorPane />
                </PanelGroup>
            </Box>
        </productDetailsContext.Provider>
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
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    
    // Handlers
    async function handleAddProduct() {
        if (selectedCollections.length > 1) {
            globalAPI.showMessage("Please select a single collection to add a new item", ESnackbarMsgVariant.warning);
            return;
        }

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
    const {magicMinPaneHeight, magicMaxPaneHeight} = React.useContext(productDetailsContext) as IProductDetailsContextAPI;
    const { collections } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const { isItemListLoading, productFilterText, filteredProducts, selectedProductId, setSelectedProductId, order, orderBy, setOrder, setOrderBy, handleProductFieldChange, setProducts, products, handleUndoProduct } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

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
        const product = products.find(p => p.productId === productId);
        if (product?.isNew) {
            setProducts(prev => prev.filter(p => p.productId !== productId));
            if (selectedProductId === productId) {
                setSelectedProductId(null);
            }
        } else {
            setProducts(prev => prev.map(p => p.productId === productId ? { ...p, isDeleted: true } : p));
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
                <TableContainer component={Paper} elevation={0} sx={{ minHeight: magicMinPaneHeight, maxHeight: magicMaxPaneHeight }}>
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
    const { magicMinPaneHeight, magicMaxPaneHeight} = React.useContext(productDetailsContext) as IProductDetailsContextAPI;
    const { selectedProductId, products, handleProductFieldChange, setProducts, setSelectedProductId } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;
    const { collections } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;

    const selectedProduct = products.find(p => p.productId === selectedProductId);

    if (!selectedProduct) {
        return (
            <Panel defaultSize={100 - itemDetailsPanelResizePaneLocationPercentage}>
                <Box sx={{ minHeight: magicMinPaneHeight, maxHeight: magicMaxPaneHeight, display: "flex", justifyContent: "center", alignItems: "center", color: "text.secondary" }}>
                    <Typography>Select a product to view details</Typography>
                </Box>
            </Panel>
        );
    }

    return (
        <Panel defaultSize={100 - itemDetailsPanelResizePaneLocationPercentage}>
            <Box sx={{ minHeight: magicMinPaneHeight, maxHeight: magicMaxPaneHeight, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                <ProductInspectorToolbar />
                <ProductInspectorDetails />
                <ProductInspectorImageTab />
                <ProductInspectorVariantTable />
                <ProductInspectorCustomFields />
            </Box>
        </Panel>
    );
}

function ProductInspectorToolbar() {

    // Global API
    const { selectedProductId, products, setProducts, setSelectedProductId, handleProductFieldChange, handleUndoProduct } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

    // Computed
    const selectedProduct = products.find(p => p.productId === selectedProductId);
    const isDeleted = !!selectedProduct?.isDeleted;

    if(!selectedProduct) {
        return null;
    }

    // Handlers
    async function handleDelete() {
        if (selectedProduct?.isNew) {
            setProducts(prev => prev.filter(p => p.productId !== selectedProductId));
            setSelectedProductId(null);
        } else {
            setProducts(prev => prev.map(p => p.productId === selectedProduct!.productId ? { ...p, isDeleted: true } : p));
        }
    }

    async function handleClone() {
        const newProductId = `new-${crypto.randomUUID()}`;
        const newProduct: EditableProduct = {
            ...selectedProduct!,
            productId: newProductId,
            name: `${selectedProduct!.name} (Copy)`,
            isNew: true,
            isEdited: true,
            isDeleted: false
        };
        setProducts(prev => [newProduct, ...prev]);
        setSelectedProductId(newProductId);
    }

    return (
        <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider', justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title="Clone item">
                <span>
                    <IconButton size="small" onClick={handleClone} disabled={isDeleted}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Undo changes">
                <span>
                    <IconButton size="small" onClick={() => handleUndoProduct(selectedProduct.productId)} disabled={!isDeleted && !selectedProduct.isEdited && !selectedProduct.isNew}>
                        <RestoreIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Delete item">
                <span>
                    <IconButton size="small" color="error" onClick={handleDelete} disabled={isDeleted}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
        </Toolbar>
    );
}

function ProductInspectorDetails() {

    // Global API
    const { collections } = React.useContext(catalogPageContext) as ICatalogPageContextAPI;
    const { selectedProductId, products, handleProductFieldChange } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

    // Computed
    const selectedProduct = products.find(p => p.productId === selectedProductId);
    const isDeleted = !!selectedProduct?.isDeleted;

    if(!selectedProduct) {
        return null;
    }

    return (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
                label="Product Name"
                value={selectedProduct.name}
                onChange={(e) => handleProductFieldChange(selectedProduct.productId, "name", e.target.value)}
                fullWidth
                size="small"
                disabled={isDeleted}
            />
            <TextField
                label="Description"
                value={selectedProduct.description || ""}
                onChange={(e) => handleProductFieldChange(selectedProduct.productId, "description", e.target.value)}
                fullWidth
                multiline
                rows={4}
                size="small"
                disabled={isDeleted}
            />
            <PickCollection
                currentCollectionId={selectedProduct.collectionId}
                collections={collections}
                onCollectionPick={(collectionId) => handleProductFieldChange(selectedProduct.productId, "collectionId", collectionId)}
                disabled={isDeleted}
            />
        </Box>
    );
}

function ProductInspectorCustomFields() {
    // Global API
    const { selectedProductId, products, handleProductFieldChange } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;

    // Local State
    const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);

    // Computed
    const selectedProduct = products.find(p => p.productId === selectedProductId);
    const isDeleted = !!selectedProduct?.isDeleted;

    if(!selectedProduct) {
        return null;
    }

    // Handlers
    function handleAddField(field: IProductField) {
        const newFields = [...(selectedProduct!.fields || []), field];
        handleProductFieldChange(selectedProduct!.productId, "fields", newFields);
    }

    function handleUpdateField(index: number, updatedField: IProductField) {
        const newFields = [...(selectedProduct!.fields || [])];
        newFields[index] = updatedField;
        handleProductFieldChange(selectedProduct!.productId, "fields", newFields);
    }

    function handleDeleteField(index: number) {
        const newFields = [...(selectedProduct!.fields || [])];
        newFields.splice(index, 1);
        handleProductFieldChange(selectedProduct!.productId, "fields", newFields);
    }

    return (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Custom Fields */}
            {(selectedProduct.fields || []).map((field, index) => (
                <React.Fragment key={index}>
                    {field.type === EProductFieldType.section && (
                        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>Section</Typography>
                                <IconButton size="small" onClick={() => handleDeleteField(index)} disabled={isDeleted}>
                                    <Close fontSize="small" />
                                </IconButton>
                            </Box>
                            <TextField
                                label="Section Title"
                                value={(field as ISectionField).sectionTitle}
                                onChange={(e) => handleUpdateField(index, { ...field, sectionTitle: e.target.value } as ISectionField)}
                                fullWidth
                                size="small"
                                sx={{ mb: 2, bgcolor: 'background.paper' }}
                                disabled={isDeleted}
                            />
                            <TextField
                                label="Section Description"
                                value={(field as ISectionField).sectionDescription}
                                onChange={(e) => handleUpdateField(index, { ...field, sectionDescription: e.target.value } as ISectionField)}
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
                                sx={{ bgcolor: 'background.paper' }}
                                disabled={isDeleted}
                            />
                        </Box>
                    )}
                    {field.type === EProductFieldType.table && (
                        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>Table</Typography>
                                <IconButton size="small" onClick={() => handleDeleteField(index)} disabled={isDeleted}>
                                    <Close fontSize="small" />
                                </IconButton>
                            </Box>
                            <TextField
                                label="Table Name"
                                value={(field as ITableField).tableName}
                                onChange={(e) => handleUpdateField(index, { ...field, tableName: e.target.value } as ITableField)}
                                fullWidth
                                size="small"
                                sx={{ mb: 1, bgcolor: 'background.paper' }}
                                disabled={isDeleted}
                            />
                            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            {(field as ITableField).columns.map((col, colIndex) => (
                                                <TableCell key={colIndex}>{col}</TableCell>
                                            ))}
                                            <TableCell align="center" width={50}>
                                                <IconButton size="small" onClick={() => {
                                                    const newRows = [...(field as ITableField).rows, new Array((field as ITableField).columns.length).fill('')];
                                                    handleUpdateField(index, { ...field, rows: newRows } as ITableField);
                                                }} disabled={isDeleted}>
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(field as ITableField).rows.map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                {row.map((cell, cellIndex) => (
                                                    <TableCell key={cellIndex} sx={{ p: 0.5 }}>
                                                        <TextField
                                                            value={cell}
                                                            onChange={(e) => {
                                                                const newRows = [...(field as ITableField).rows];
                                                                newRows[rowIndex] = [...newRows[rowIndex]];
                                                                newRows[rowIndex][cellIndex] = e.target.value;
                                                                handleUpdateField(index, { ...field, rows: newRows } as ITableField);
                                                            }}
                                                            fullWidth
                                                            size="small"
                                                            variant="standard"
                                                            disabled={isDeleted}
                                                        />
                                                    </TableCell>
                                                ))}
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => {
                                                        const newRows = [...(field as ITableField).rows];
                                                        newRows.splice(rowIndex, 1);
                                                        handleUpdateField(index, { ...field, rows: newRows } as ITableField);
                                                    }} disabled={isDeleted}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </React.Fragment>
            ))}

            <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setIsAddFieldDialogOpen(true)}
                disabled={isDeleted}
            >
                Add Field
            </Button>

            <AddProductFieldDialog
                open={isAddFieldDialogOpen}
                onClose={() => setIsAddFieldDialogOpen(false)}
                onAdd={handleAddField}
            />
        </Box>
    );
}

function ProductInspectorImageTab() {
    const { selectedProductId, products, handleProductFieldChange } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const productService = ProductService.getInstance();

    const selectedProduct = products.find(p => p.productId === selectedProductId);
    const isDeleted = !!selectedProduct?.isDeleted;

    const [isImageProcessing, setIsImageProcessing] = useState(false);

    if (!selectedProduct) return null;

    const imageUrls = selectedProduct.imageUrls || [];

    async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImageProcessing(true);
        try {
            // Calculate MD5
            const arrayBuffer = await file.arrayBuffer();
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
            const contentMd5 = CryptoJS.enc.Base64.stringify(CryptoJS.MD5(wordArray));

            // Get presigned URL
            const { uploadUrl, key, requiredHeaders } = await productService.getPresignedUploadUrl(file.name, file.type, contentMd5, file.size);

            // Upload to S3
            await productService.uploadFileToS3(uploadUrl, file, requiredHeaders);

            // Construct public URL
            const bucket = OutputParser.MemoryBucketName;
            const region = Constants.region;
            const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
            
            // Update product
            const newImages = [...imageUrls, publicUrl];
            handleProductFieldChange(selectedProduct!.productId, "imageUrls", newImages);
            
        } catch (error) {
            console.error(error);
            globalAPI.showMessage("Failed to upload image", ESnackbarMsgVariant.error);
        } finally {
            setIsImageProcessing(false);
            // Reset input
            event.target.value = '';
        }
    }

    async function handleDeleteImage(index: number) {
        const urlToDelete = imageUrls[index];
        setIsImageProcessing(true);
        try {
            // Extract key from URL
            // URL format: https://bucket.s3.region.amazonaws.com/key
            const urlObj = new URL(urlToDelete);
            const key = urlObj.pathname.substring(1); // remove leading slash

            // Delete from S3
            await productService.deleteImage(key);
            
            // Update product
            const newImages = imageUrls.filter((_, i) => i !== index);
            handleProductFieldChange(selectedProduct!.productId, "imageUrls", newImages);
        } catch (error) {
             console.error(error);
             globalAPI.showMessage("Failed to delete image", ESnackbarMsgVariant.error);
        } finally {
            setIsImageProcessing(false);
        }
    }

    function handleMoveImage(index: number, direction: 'up' | 'down') {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === imageUrls.length - 1) return;

        const newImages = [...imageUrls];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
        
        handleProductFieldChange(selectedProduct!.productId, "imageUrls", newImages);
    }

    return (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle2">Images</Typography>
                <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={isDeleted || isImageProcessing}
                >
                    Upload
                    <input type="file" hidden accept="image/*" onChange={handleUpload} />
                </Button>
            </Box>
            
            {isImageProcessing && <LinearProgress />}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {imageUrls.map((url, index) => (
                    <Paper key={url} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 2 }}>
                        <Box
                            component="img"
                            src={url}
                            sx={{ width: 60, height: 60, objectFit: "cover", borderRadius: 1, cursor: 'pointer' }}
                            onClick={() => window.open(url, '_blank')}
                        />
                        <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                            <Typography variant="caption" noWrap title={url}>{url.split('/').pop()}</Typography>
                        </Box>
                        <Box sx={{ display: "flex" }}>
                            <IconButton size="small" onClick={() => handleMoveImage(index, 'up')} disabled={index === 0 || isDeleted}>
                                <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleMoveImage(index, 'down')} disabled={index === imageUrls.length - 1 || isDeleted}>
                                <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteImage(index)} disabled={isDeleted}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Paper>
                ))}
                {imageUrls.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">No images</Typography>
                )}
            </Box>
        </Box>
    );
}

function ProductActionPane() {

    // Global API
    const globalAPI = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const { hasUnsavedChanges, isLoading, setIsLoading, products, reloadProducts, variantsByProductId } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;
    const productService = ProductService.getInstance();

    // Handlers
    async function handleCancel() {
        await reloadProducts();
    }

    async function handleOk() {
        setIsLoading(true);
        try {
            const promises: Promise<any>[] = [];
            const tempVariantIdToRealIdMap = new Map<string, string>();
            const productsToUpdateDefaultVariant: { productId: string, defaultVariantId: string }[] = [];

            // 1. Delete variants
            for (const [productId, variants] of Object.entries(variantsByProductId)) {
                for (const variant of variants) {
                    if (variant.isDeleted && !variant.isNew) {
                        promises.push(productService.deleteVariant(variant.variantId));
                    }
                }
            }
            
            // 2. Delete products
            for (const product of products) {
                if (product.isDeleted && !product.isNew) {
                    promises.push(productService.deleteProduct(product.productId));
                }
            }
            
            await Promise.all(promises);
            promises.length = 0;

            // 3. Create New Products
            const tempProductIdToRealIdMap = new Map<string, string>();
            
            for (const product of products) {
                if (product.isNew && !product.isDeleted) {
                    // Check if defaultVariantId is temporary
                    let productToCreate = { ...product };
                    const isDefaultVariantNew = product.defaultVariantId?.startsWith('new-');
                    
                    if (isDefaultVariantNew) {
                        delete productToCreate.defaultVariantId;
                    }

                    const createdProduct = await productService.createProduct(productToCreate);
                    tempProductIdToRealIdMap.set(product.productId, createdProduct.productId);
                    
                    if (isDefaultVariantNew && product.defaultVariantId) {
                        productsToUpdateDefaultVariant.push({
                            productId: createdProduct.productId,
                            defaultVariantId: product.defaultVariantId // This is the temp ID, we'll resolve it later
                        });
                    }
                }
            }

            // 4. Create New Variants (for both new and existing products)
            const createVariantPromises: Promise<void>[] = [];

            // Helper to create variant and update map
            const createVariantAndMap = async (variant: EditableVariant, realProductId: string) => {
                const { variantId, isNew, isDeleted, isEdited, ...variantData } = variant;
                variantData.productId = realProductId;
                const createdVariant = await productService.createVariant(variantData);
                tempVariantIdToRealIdMap.set(variantId, createdVariant.variantId);
            };

            for (const product of products) {
                if (product.isDeleted) continue;

                const realProductId = product.isNew ? tempProductIdToRealIdMap.get(product.productId)! : product.productId;
                const variants = variantsByProductId[product.productId] || [];

                for (const variant of variants) {
                    if (variant.isNew && !variant.isDeleted) {
                        createVariantPromises.push(createVariantAndMap(variant, realProductId));
                    }
                }
            }
            
            await Promise.all(createVariantPromises);

            // 5. Update Existing Products & Variants
            
            // Update existing products
            for (const product of products) {
                if (product.isEdited && !product.isNew && !product.isDeleted) {
                    let productToUpdate = { ...product };
                    
                    // If default variant is new, we need to resolve it
                    if (product.defaultVariantId?.startsWith('new-')) {
                        const realVariantId = tempVariantIdToRealIdMap.get(product.defaultVariantId);
                        if (realVariantId) {
                            productToUpdate.defaultVariantId = realVariantId;
                        } else {
                            delete productToUpdate.defaultVariantId; 
                        }
                    }
                    
                    promises.push(productService.updateProduct(product.productId, productToUpdate));
                }
            }

            // Update existing variants
             for (const [productId, variants] of Object.entries(variantsByProductId)) {
                for (const variant of variants) {
                    if (variant.isEdited && !variant.isNew && !variant.isDeleted) {
                        const { variantId, isNew, isDeleted, isEdited, ...variantData } = variant;
                        promises.push(productService.updateVariant(variant.variantId, variantData));
                    }
                }
            }
            
            // 6. Apply deferred defaultVariantId updates for New Products
            for (const item of productsToUpdateDefaultVariant) {
                const realVariantId = tempVariantIdToRealIdMap.get(item.defaultVariantId);
                if (realVariantId) {
                    promises.push(productService.updateDefaultVariant(item.productId, realVariantId));
                }
            }

            await Promise.all(promises);

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

function ProductInspectorVariantTable() {
    const { selectedProductId, variantsByProductId, setVariantsByProductId, products, handleProductFieldChange, isVariantTableLoading, setIsVariantTableLoading } = React.useContext(itemDetailsPanelContext) as IItemDetailsPanelContextAPI;
    const productService = ProductService.getInstance();
    const isMounted = useIsMounted();

    const selectedProduct = products.find(p => p.productId === selectedProductId);
    const isDeleted = !!selectedProduct?.isDeleted;

    useEffect(() => {
        if (selectedProductId && !variantsByProductId[selectedProductId]) {
            loadVariants(selectedProductId);
        }
    }, [selectedProductId]);

    async function loadVariants(productId: string) {
        if (isMounted.current) {
            setIsVariantTableLoading(true);
        }
        try {
            const variants = await productService.getVariantsByProductId(productId);
            if (isMounted.current && variants) {
                setVariantsByProductId(prev => ({ ...prev, [productId]: variants }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (isMounted.current) {
                setIsVariantTableLoading(false);
            }
        }
    }

    if (!selectedProductId) return null;

    const variants = variantsByProductId[selectedProductId] || [];
    const visibleVariants = variants;

    function handleVariantChange<K extends keyof EditableVariant>(variantId: string, field: K, value: EditableVariant[K]) {
        setVariantsByProductId(prev => {
            const currentVariants = prev[selectedProductId!] || [];
            const updatedVariants = currentVariants.map(v => v.variantId === variantId ? { ...v, [field]: value, isEdited: true } : v);
            return { ...prev, [selectedProductId!]: updatedVariants };
        });
    }

    function handleAddVariant() {
        const newVariantId = `new-${crypto.randomUUID()}`;
        const newVariant: EditableVariant = {
            variantId: newVariantId,
            productId: selectedProductId!,
            collectionId: selectedProduct?.collectionId || "",
            name: "New Variant",
            price: 0,
            stock: 0,
            maximumInOrder: 0,
            relatedProductIds: [],
            isNew: true,
            isEdited: true
        };

        setVariantsByProductId(prev => {
            const currentVariants = prev[selectedProductId!] || [];
            return { ...prev, [selectedProductId!]: [...currentVariants, newVariant] };
        });
    }

    function handleDeleteVariant(variantId: string) {
        setVariantsByProductId(prev => {
            const currentVariants = prev[selectedProductId!] || [];
            const variant = currentVariants.find(v => v.variantId === variantId);
            if (variant?.isNew) {
                return { ...prev, [selectedProductId!]: currentVariants.filter(v => v.variantId !== variantId) };
            } else {
                return { ...prev, [selectedProductId!]: currentVariants.map(v => v.variantId === variantId ? { ...v, isDeleted: true } : v) };
            }
        });
    }

    function handleUndoVariant(variantId: string) {
        setVariantsByProductId(prev => {
            const currentVariants = prev[selectedProductId!] || [];
            return { ...prev, [selectedProductId!]: currentVariants.map(v => v.variantId === variantId ? { ...v, isDeleted: false } : v) };
        });
    }

    return (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, }}>
             <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle2">Variants</Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddVariant}
                    disabled={isDeleted}
                >
                    Add Variant
                </Button>
            </Box>
            {isVariantTableLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1 }}>
                    <CircularProgress />
                </Box>
            ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, overflow: "auto" }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="right">Stock</TableCell>
                            <TableCell align="right">Max Order</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleVariants.map((variant) => {
                            const isVariantDeleted = !!variant.isDeleted;
                            return (
                                <TableRow key={variant.variantId} sx={{ opacity: isVariantDeleted ? 0.5 : 1 }}>
                                    <TableCell>
                                        <TextField
                                            value={variant.name}
                                            onChange={(e) => handleVariantChange(variant.variantId, "name", e.target.value)}
                                            variant="standard"
                                            size="small"
                                            disabled={isVariantDeleted || isDeleted}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            value={variant.price}
                                            onChange={(e) => handleVariantChange(variant.variantId, "price", Number(e.target.value))}
                                            variant="standard"
                                            size="small"
                                            type="number"
                                            disabled={isVariantDeleted || isDeleted}
                                            inputProps={{ style: { textAlign: 'right' } }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            value={variant.stock}
                                            onChange={(e) => handleVariantChange(variant.variantId, "stock", Number(e.target.value))}
                                            variant="standard"
                                            size="small"
                                            type="number"
                                            disabled={isVariantDeleted || isDeleted}
                                            inputProps={{ style: { textAlign: 'right' } }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            value={variant.maximumInOrder ?? ""}
                                            onChange={(e) => handleVariantChange(variant.variantId, "maximumInOrder", e.target.value === "" ? undefined : Number(e.target.value))}
                                            variant="standard"
                                            size="small"
                                            type="number"
                                            disabled={isVariantDeleted || isDeleted}
                                            inputProps={{ style: { textAlign: 'right' } }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                         <Box sx={{ display: "flex", justifyContent: "center" }}>
                                            <Tooltip title={selectedProduct?.defaultVariantId === variant.variantId ? "Default variant" : "Set as default"}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleProductFieldChange(selectedProduct!.productId, "defaultVariantId", variant.variantId)}
                                                        disabled={isDeleted || isVariantDeleted}
                                                        color={selectedProduct?.defaultVariantId === variant.variantId ? "warning" : "default"}
                                                    >
                                                        {selectedProduct?.defaultVariantId === variant.variantId ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            {isVariantDeleted ? (
                                                <Tooltip title="Undo delete">
                                                    <IconButton size="small" onClick={() => handleUndoVariant(variant.variantId)} disabled={isDeleted}>
                                                        <RestoreIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Delete variant">
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteVariant(variant.variantId)} disabled={isDeleted}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {visibleVariants.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">No variants</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            )}
        </Box>
    );
}