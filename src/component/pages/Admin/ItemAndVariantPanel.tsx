import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Fuse from "fuse.js";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import OutputParser from "../../../service/OutputParser";
import { getComparator, Order, stableSort } from "./AdminConsoleHelper";

import ProductService from "../../../service/ProductService";
import AuthService from "../../../service/AuthService";

import { Box, Button, Chip, CircularProgress, Divider, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Toolbar, Typography } from '@mui/material';
import PanelShell from "./PanelShell";
import ImageCarousel from "./ImageViewer";
import PickCollection from './PickCollection';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import IProductRecord from "../../../interface/product/IProductRecord";
import IProduct from "../../../interface/product/IProduct";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import IProductVariant from "../../../interface/product/IProductVariant";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import useIsMounted from '../../../hooks/useIsMounted';
import ICollectionRecord from '../../../interface/product/ICollectionRecord';

type EditableProduct = IProductRecord & {
    isNew?: boolean;
    isDeleted?: boolean;
};

type EditableVariant = IProductVariantRecord & {
    isNew?: boolean;
    isDeleted?: boolean;
    isEdited?: boolean;
};

type ProductOrderBy = keyof IProductRecord;

export interface ItemAndVariantPanelProps {
    selectedCollectionIds: string[];
    allCollections: ICollectionRecord[];
}

export default function ItemAndVariantPanel(props: ItemAndVariantPanelProps) {

    // Global API
    const globalAPI = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const productService = ProductService.getInstance();
    const isMounted = useIsMounted();

    // Page State
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    // Products and Variants State
    const [products, setProducts] = useState<EditableProduct[]>([]);
    const [variantsByProductId, setVariantsByProductId] = useState<Record<string, EditableVariant[]>>({});

    // Product Panel State
    const [productFilterText, setProductFilterText] = useState<string>("");
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
    const [imageUploadStatus, setImageUploadStatus] = useState<string>("");
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [order, setOrder] = useState<Order>("asc");
    const [orderBy, setOrderBy] = useState<ProductOrderBy>("name");

    // Variant Panel State
    const [isVariantPanelLoading, setIsVariantPanelLoading] = useState<boolean>(false);

    // Computed Properties
    const selectedProduct: EditableProduct | undefined = useMemo(
        () => products.find((p) => p.productId === selectedProductId),
        [products, selectedProductId]
    );

    const selectedProductVariants: EditableVariant[] = useMemo(
        () => (selectedProductId ? variantsByProductId[selectedProductId] ?? [] : []),
        [variantsByProductId, selectedProductId]
    );

    // Effects
    useEffect(() => {
        fetchProducts();
    }, [props.selectedCollectionIds, globalAPI]);

    useEffect(() => {
        let isMounted = true;
        
        if (selectedProductId && !variantsByProductId[selectedProductId]) {
            fetchVariantsForProduct(selectedProductId, isMounted);
        }

        return () => {
            isMounted = false;
        }
    },  [selectedProductId, variantsByProductId, globalAPI]);

    // Helper Methods
    function resetItemPanelState() {
        if(isMounted.current) {   
            setSelectedImageFile(null);
            setImageUploadStatus("");
            setIsUploadingImage(false);
            setHasUnsavedChanges(false);
            
            setProducts([]);
            setVariantsByProductId({});
        }
    }

    async function fetchProducts() {
        if(isMounted.current) {
            resetItemPanelState();
            setIsLoading(true);
        }
    
        try {
            const productRecords: EditableProduct[] = [];
            const seen = new Set<string>(); // This is basically to avoid duplicate products when multiple collections are selected (should not happen according to our data model but just in case)
            const results: (IProductRecord[] | null)[] = await Promise.all(props.selectedCollectionIds.map((id) => productService.getProductsByCollectionId(id)));
            for (const arr of results) {
                for (const p of arr ?? []) {
                    if (!seen.has(p.productId)) {
                        seen.add(p.productId);
                        productRecords.push({ ...p });
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

    async function fetchVariantsForProduct(productId: string, isMounted: boolean) {
        setIsVariantPanelLoading(true);
        try {
            const variants = await productService.getVariantsByProductId(productId);
            if (isMounted) {
                setVariantsByProductId((prev) => ({
                    ...prev,
                    [productId]: (variants ?? []).map((v) => ({ ...v })),
                }));
            }
        }
        catch (error) {
            console.error("Failed to load variants", error);
            globalAPI.showMessage("Failed to load variants for selected product", ESnackbarMsgVariant.error);
        }
        finally {
            if (isMounted) {
                setIsVariantPanelLoading(false);
            }
        }
    }

    // Handler Methods
    function handleRequestSort(property: ProductOrderBy) {
        // First click on a column sorts ascending, second click sorts descending
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    }

    function markDirty() {
        if (!hasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
    }

    function handleSelectProduct(productId: string) {
        setSelectedProductId(productId);
    }
    
    function handleProductFieldChange<K extends keyof IProductRecord>(productId: string, field: K, value: IProductRecord[K]) {
        setProducts((prev) => prev.map((p) => p.productId === productId ? { ...p, [field]: value } : p));
        markDirty();
    }

    function handleAddProduct() {
        if (!props.selectedCollectionIds || props.selectedCollectionIds.length === 0) {
            globalAPI.showMessage("Select a collection before adding items", ESnackbarMsgVariant.warning);
            return;
        }
        else if( props.selectedCollectionIds.length > 1) {
            globalAPI.showMessage("Please select only one collection to add a new item", ESnackbarMsgVariant.warning);
            return;
        }

        const collectionId = props.selectedCollectionIds[0];
        const tempId = `temp-${Date.now()}`;

        const newProduct: EditableProduct = {
            productId: tempId,
            name: "New Item",
            description: "",
            collectionId,
            defaultVariantId: undefined,
            fields: [],
            imageUrls: [],
            isNew: true,
        };

        setProducts((prev) => [newProduct, ...prev]);
        setSelectedProductId(tempId);
        markDirty();
    }

    function handleDeleteProduct(productId: string) {
        setProducts((prev) =>
            prev.map((p) =>
                p.productId === productId
                    ? { ...p, isDeleted: true }
                    : p
            )
        );
        if (selectedProductId === productId) {
            setSelectedProductId(null);
        }
        markDirty();
    }

    function handleUndoDeleteProduct(productId: string) {
        setProducts((prev) =>
            prev.map((p) =>
                p.productId === productId
                    ? { ...p, isDeleted: false }
                    : p
            )
        );
        markDirty();
    }

    function handleDeleteImage(productId: string, index: number) {
        setProducts((prev) =>
            prev.map((p) =>
                p.productId === productId
                    ? {
                        ...p,
                        imageUrls: (p.imageUrls ?? []).filter((_, i) => i !== index),
                    }
                    : p
            )
        );
        markDirty();
    }

    function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setImageUploadStatus("");
        const file = e.target.files?.[0] ?? null;
        setSelectedImageFile(file);
    }

    async function handleUploadImage(productId: string) {
        if (!selectedImageFile) {
            setImageUploadStatus("Please select an image first");
            return;
        }
        try {
            setIsUploadingImage(true);
            setImageUploadStatus("Uploading...");
            const key = await AuthService.getInstance().uploadImage(selectedImageFile);
            const bucket = OutputParser.MemoryBucketName;
            const url = `https://${bucket}.s3.amazonaws.com/${encodeURI(key)}`;
            setProducts((prev) =>
                prev.map((p) =>
                    p.productId === productId
                        ? { ...p, imageUrls: [...(p.imageUrls ?? []), url] }
                        : p
                )
            );
            setSelectedImageFile(null);
            setImageUploadStatus("Upload complete");
            markDirty();
        } catch (error: any) {
            console.error("Failed to upload image", error);
            const msg = error?.message || "Image upload failed";
            setImageUploadStatus(msg);
            globalAPI.showMessage(msg, ESnackbarMsgVariant.error);
        } finally {
            setIsUploadingImage(false);
        }
    }

    function handleAddVariant() {
        if (!selectedProduct) {
            globalAPI.showMessage("Select an item before adding variants", ESnackbarMsgVariant.warning);
            return;
        }

        const tempId = `temp-var-${Date.now()}`;
        const base: EditableVariant = {
            variantId: tempId,
            name: "New Variant",
            price: 0,
            stock: 0,
            maximumInOrder: undefined,
            relatedProductIds: [],
            productId: selectedProduct.productId,
            collectionId: selectedProduct.collectionId ?? "",
            isNew: true,
        };

        setVariantsByProductId((prev) => ({
            ...prev,
            [selectedProduct.productId]: [base, ...(prev[selectedProduct.productId] ?? [])],
        }));
        markDirty();
    }

    function handleVariantFieldChange<K extends keyof IProductVariantRecord>(variantId: string, field: K, value: IProductVariantRecord[K]) {
        if (!selectedProductId) {
            return;
        }

        setVariantsByProductId((prev) => {
            const list = prev[selectedProductId] ?? [];
            return {
                ...prev,
                [selectedProductId]: list.map((v) =>
                    v.variantId === variantId
                        ? { ...v, [field]: value }
                        : v
                ),
            };
        });
        markDirty();
    }

    function handleDeleteVariant(variantId: string) {
        if (!selectedProductId) return;
        setVariantsByProductId((prev) => {
            const list = prev[selectedProductId] ?? [];
            return {
                ...prev,
                [selectedProductId]: list.map((v) =>
                    v.variantId === variantId
                        ? { ...v, isDeleted: true }
                        : v
                ),
            };
        });
        markDirty();
    }

    function handleUndoDeleteVariant(variantId: string) {
        if (!selectedProductId) return;
        setVariantsByProductId((prev) => {
            const list = prev[selectedProductId] ?? [];
            return {
                ...prev,
                [selectedProductId]: list.map((v) =>
                    v.variantId === variantId
                        ? { ...v, isDeleted: false }
                        : v
                ),
            };
        });
        markDirty();
    }

    async function handleCancel() {
        await fetchProducts();
    }

    async function handleOk() {
        try {
            setIsLoading(true);

            const originalProductsById = new Map<string, IProductRecord>();
            for (const p of products) {
                if (!p.isNew) {
                    originalProductsById.set(p.productId, p);
                }
            }

            // First handle products (create / update / delete)
            const tempIdToRealId = new Map<string, string>();

            for (const product of products) {
                if (product.isNew && product.isDeleted) {
                    continue; // never persisted
                }

                if (product.isDeleted) {
                    if (!product.isNew) {
                        await productService.deleteProduct(product.productId);
                    }
                    continue;
                }

                let productDefaultVariantId = product.defaultVariantId;
                // If the default variant still has a temporary ID, defer setting it
                // until after variants are created and we know the real ID.
                if (productDefaultVariantId && productDefaultVariantId.startsWith("temp-var-")) {
                    productDefaultVariantId = undefined;
                }

                const productPayload: IProduct = {
                    name: product.name,
                    description: product.description,
                    collectionId: product.collectionId,
                    defaultVariantId: productDefaultVariantId,
                    fields: product.fields,
                    imageUrls: product.imageUrls,
                };

                if (product.isNew) {
                    const created = await productService.createProduct(productPayload);
                    tempIdToRealId.set(product.productId, created.productId);
                } else {
                    await productService.updateProduct(product.productId, productPayload);
                }
            }

            // Then handle variants for all products we have in memory
            const tempVariantIdToRealId = new Map<string, string>();
            for (const [productIdKey, variants] of Object.entries(variantsByProductId)) {
                const actualProductId = tempIdToRealId.get(productIdKey) ?? productIdKey;
                for (const variant of variants) {
                    const isTemp = variant.isNew && variant.variantId.startsWith("temp-var-");

                    if (variant.isNew && variant.isDeleted) {
                        continue;
                    }

                    if (variant.isDeleted) {
                        if (!variant.isNew) {
                            await productService.deleteVariant(variant.variantId);
                        }
                        continue;
                    }

                    const variantPayload: IProductVariant = {
                        name: variant.name,
                        price: variant.price,
                        stock: variant.stock,
                        maximumInOrder: variant.maximumInOrder,
                        relatedProductIds: variant.relatedProductIds,
                        productId: actualProductId,
                        collectionId:
                            products.find((p) => p.productId === actualProductId)?.collectionId ?? variant.collectionId,
                    };

                    if (variant.isNew) {
                        const createdVariant = await productService.createVariant(variantPayload);
                        if (isTemp) {
                            tempVariantIdToRealId.set(variant.variantId, createdVariant.variantId);
                        }
                    } else {
                        await productService.updateVariant(variant.variantId, variantPayload);
                    }
                }
            }

            // Finally, update default variants where needed, after we know real IDs
            for (const product of products) {
                const actualProductId = tempIdToRealId.get(product.productId) ?? product.productId;
                const original = product.isNew ? undefined : originalProductsById.get(product.productId);

                let desiredDefaultVariantId = product.defaultVariantId;
                if (desiredDefaultVariantId && desiredDefaultVariantId.startsWith("temp-var-")) {
                    const mapped = tempVariantIdToRealId.get(desiredDefaultVariantId);
                    desiredDefaultVariantId = mapped;
                }

                const originalDefaultVariantId = original?.defaultVariantId;

                if (desiredDefaultVariantId && desiredDefaultVariantId !== originalDefaultVariantId) {
                    await productService.updateDefaultVariant(actualProductId, desiredDefaultVariantId);
                }
            }

            globalAPI.showMessage("Changes saved successfully", ESnackbarMsgVariant.success);
            setHasUnsavedChanges(false);

            // Reload everything from backend to get fresh state
            await fetchProducts();
        } catch (error) {
            console.error("Failed to save item and variant changes", error);
            globalAPI.showMessage("Failed to save changes", ESnackbarMsgVariant.error);
        } finally {
            setIsLoading(false);
        }
    }

    const visibleProducts = useMemo(() => products.filter((p) => !p.isDeleted),[products]);

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

    const headCells: { id: ProductOrderBy; label: string }[] = [
        { id: "name", label: "Item Name" },
        { id: "collectionId", label: "Collection" },
    ];

    return (
        <PanelShell flexBasis='75%'>
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
                    <Typography variant="h5">Items & Variants</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Items are filtered by the collections selected on the left.
                    </Typography>
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

            <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
                <PanelGroup direction="horizontal">
                    {/* Left: Items table */}
                    <Panel defaultSize={40} minSize={25} maxSize={60}>
                        <Box sx={{ height: "100%", borderRight: (theme) => `1px solid ${theme.palette.divider}`, display: "flex", flexDirection: "column" }}>
                            <Toolbar variant="dense" sx={{ gap: 1, px: 2, py: 1 }}>
                        <Typography variant="subtitle1">
                            Items
                        </Typography>
                        <TextField
                            placeholder="Search items"
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
                        <IconButton
                            size="small"
                            color="primary"
                            aria-label="add item"
                            onClick={handleAddProduct}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                            </Toolbar>
                            {isLoading ? (
                                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                                    <CircularProgress size={24} />
                                </Box>
                            ) : (
                                <Box sx={{ overflowY: "auto", height: "calc(100% - 56px)" }}> {/** TODO: remove the magic number 56 */}
                                    <TableContainer component={Paper} elevation={0}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
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
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                            {stableSort<any>(filteredProducts, getComparator(order, orderBy))
                                            .map((row) => {
                                                const isSelected = row.productId === selectedProductId;
                                                const isDeleted = !!row.isDeleted;
                                                return (
                                                    <TableRow
                                                        hover
                                                        key={row.productId}
                                                        selected={isSelected}
                                                        onClick={() => handleSelectProduct(row.productId)}
                                                        sx={{ cursor: "pointer" }}
                                                    >
                                                        <TableCell>
                                                            <TextField
                                                                value={row.name}
                                                                onChange={(e) =>
                                                                    handleProductFieldChange(
                                                                        row.productId,
                                                                        "name",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                variant="standard"
                                                                fullWidth
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 140 }}>
                                                            <PickCollection
                                                                currentCollectionId={row.collectionId}
                                                                onCollectionPick={(collectionId: string) =>
                                                                    handleProductFieldChange(row.productId, "collectionId", collectionId)
                                                                }
                                                                collections={props.allCollections}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {isDeleted ? (
                                                                <Button
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUndoDeleteProduct(row.productId);
                                                                    }}
                                                                >
                                                                    Undo
                                                                </Button>
                                                            ) : (
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    aria-label="delete item"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteProduct(row.productId);
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
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
                    )}
                        </Box>
                    </Panel>

                    <PanelResizeHandle>
                        <Box
                            sx={{
                                width: 4,
                                cursor: "col-resize",
                                bgcolor: (theme) => theme.palette.divider,
                                '&:hover': {
                                    bgcolor: (theme) => theme.palette.action.hover,
                                },
                            }}
                        />
                    </PanelResizeHandle>

                    {/* Right: Selected item details + variants */}
                    <Panel minSize={40}>
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                minWidth: 0,
                                maxHeight: "calc(100vh - 262px)",
                                minHeight: "calc(100vh - 262px)",
                                overflowY: "auto",
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                {selectedProduct ? (
                                    <>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Item details
                                        </Typography>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 720 }}>
                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                                <TextField
                                                    label="Name"
                                                    fullWidth
                                                    size="small"
                                                    value={selectedProduct.name}
                                                    onChange={(e) =>
                                                        handleProductFieldChange(
                                                            selectedProduct.productId,
                                                            "name",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <TextField
                                                    label="Description"
                                                    fullWidth
                                                    multiline
                                                    minRows={2}
                                                    size="small"
                                                    value={selectedProduct.description ?? ""}
                                                    onChange={(e) =>
                                                        handleProductFieldChange(
                                                            selectedProduct.productId,
                                                            "description",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </Box>

                                            {/* Images */}
                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Images
                                                </Typography>
                                                <ImageCarousel
                                                    imageUrls={selectedProduct.imageUrls ?? []}
                                                    imageWidth='100px'
                                                    aspectRatio='16 / 9'
                                                />
                                                <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center", flexWrap: "wrap" }}>
                                                    <Button
                                                        variant="outlined"
                                                        component="label"
                                                        size="small"
                                                    >
                                                        Choose image
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={handleImageFileChange}
                                                        />
                                                    </Button>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            minWidth: 0,
                                                            flexGrow: 1,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        {selectedImageFile ? selectedImageFile.name : "No file selected"}
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => handleUploadImage(selectedProduct.productId)}
                                                        disabled={!selectedImageFile || isUploadingImage}
                                                    >
                                                        {isUploadingImage ? "Uploading..." : "Upload"}
                                                    </Button>
                                                </Box>
                                                {imageUploadStatus && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {imageUploadStatus}
                                                    </Typography>
                                                )}
                                                {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 && (
                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
                                                        {selectedProduct.imageUrls.map((url, index) => (
                                                            <Box
                                                                key={`${url}-${index}`}
                                                                sx={{
                                                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                                                    borderRadius: 1,
                                                                    p: 0.5,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 0.5,
                                                                    maxWidth: 260,
                                                                }}
                                                            >
                                                                <Box
                                                                        component="img"
                                                                        src={url}
                                                                        alt={`thumb-${index}`}
                                                                        sx={{
                                                                            width: 40,
                                                                            height: 40,
                                                                            objectFit: "cover",
                                                                            borderRadius: 0.5,
                                                                            bgcolor: "background.paper",
                                                                        }}
                                                                    />
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            flexGrow: 1,
                                                                            whiteSpace: "nowrap",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                        }}
                                                                    >
                                                                        {url}
                                                                    </Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        aria-label="delete image"
                                                                        onClick={() =>
                                                                            handleDeleteImage(selectedProduct.productId, index)
                                                                        }
                                                                    >
                                                                        <DeleteIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Box>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                            <Toolbar variant="dense" sx={{ gap: 1, px: 0, py: 0 }}>
                                                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                                    Variants
                                                </Typography>
                                                <IconButton
                                                    
size="small"
                                                    color="primary"
                                                    aria-label="add variant"
                                                    onClick={handleAddVariant}
                                                    disabled={!selectedProduct}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Toolbar>
                                            <TableContainer component={Paper} elevation={0}>
                                                <Table size="small" stickyHeader>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Name</TableCell>
                                                            <TableCell>Price (₹, paise)</TableCell>
                                                            <TableCell>Stock</TableCell>
                                                            <TableCell>Max / order</TableCell>
                                                            <TableCell align="right">Actions</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {selectedProductVariants.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={5} align="center">
                                                                    No variants. Use the + button to add one.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {selectedProductVariants.map((variant) => (
                                                            <TableRow key={variant.variantId}>
                                                                <TableCell>
                                                                    <TextField
                                                                        variant="standard"
                                                                        size="small"
                                                                        fullWidth
                                                                        value={variant.name}
                                                                        onChange={(e) =>
                                                                            handleVariantFieldChange(
                                                                                variant.variantId,
                                                                                "name",
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        variant="standard"
                                                                        size="small"
                                                                        type="number"
                                                                        fullWidth
                                                                        value={variant.price}
                                                                        onChange={(e) =>
                                                                            handleVariantFieldChange(
                                                                                variant.variantId,
                                                                                "price",
                                                                                Number(e.target.value || 0)
                                                                            )
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        variant="standard"
                                                                        size="small"
                                                                        type="number"
                                                                        fullWidth
                                                                        value={variant.stock}
                                                                        onChange={(e) =>
                                                                            handleVariantFieldChange(
                                                                                variant.variantId,
                                                                                "stock",
                                                                                Number(e.target.value || 0)
                                                                            )
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        variant="standard"
                                                                        size="small"
                                                                        type="number"
                                                                        fullWidth
                                                                        value={variant.maximumInOrder ?? ""}
                                                                        onChange={(e) =>
                                                                            handleVariantFieldChange(
                                                                                variant.variantId,
                                                                                "maximumInOrder",
                                                                                e.target.value === "" ? undefined : Number(e.target.value)
                                                                            )
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                                                                        <IconButton
                                                                                size="small"
                                                                                aria-label="set default variant"
                                                                                onClick={() => {
                                                                                    if (!selectedProduct) {
                                                                                        return;
                                                                                    }
                                                                                    setProducts((prev) =>
                                                                                        prev.map((p) =>
                                                                                            p.productId === selectedProduct.productId
                                                                                                ? { ...p, defaultVariantId: variant.variantId }
                                                                                                : p
                                                                                        )
                                                                                    );
                                                                                    markDirty();
                                                                                }}
                                                                            >
                                                                            {selectedProduct?.defaultVariantId === variant.variantId ? (
                                                                                <StarIcon color="warning" fontSize="small" />
                                                                            ) : (
                                                                                <StarBorderIcon fontSize="small" />
                                                                            )}
                                                                        </IconButton>
                                                                        {variant.isDeleted ? (
                                                                            <Button
                                                                                    size="small"
                                                                                    onClick={() => handleUndoDeleteVariant(variant.variantId)}
                                                                                >
                                                                                    Undo
                                                                                </Button>
                                                                            ) : (
                                                                                <IconButton
                                                                                    size="small"
                                                                                    color="error"
                                                                                    aria-label="delete variant"
                                                                                    onClick={() => handleDeleteVariant(variant.variantId)}
                                                                                >
                                                                                    <DeleteIcon fontSize="small" />
                                                                                </IconButton>
                                                                            )}
                                                                        </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Select an item on the left to edit its details and variants.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Panel>
                </PanelGroup>
            </Box>

            {/* Sticky OK / Cancel bar */}
            <Box
                sx={{
                    position: "sticky",
                    bottom: 0,
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
                <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleOk}
                    disabled={isLoading || !hasUnsavedChanges}
                >
                    OK
                </Button>
            </Box>
        </PanelShell>
    );
}