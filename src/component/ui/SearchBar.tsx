import React from "react";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import { alpha, Avatar, ClickAwayListener, IconButton, InputBase, Paper, SxProps, Typography, useTheme } from "@mui/material";
import Fuse from 'fuse.js';

import SearchIcon from '@mui/icons-material/Search';
import { Theme } from "@emotion/react";
import ProductService from "../../service/ProductService";
import IProductSearchIndex from "../../interface/product/IProductSearchIndex";
import { getProductPath } from "../../helper/ProductUrlHelper";
import { appGlobalStateContext } from "../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../enum/ESnackbarMsgVariant";

export interface SearchBarProps {
    placeholder?: string;
    sx?: SxProps<Theme>;
    onSearchTriggered?: () => void;
}

const MAX_SEARCH_QUERY_LENGTH = 25;

interface ISearchOption {
    productId: string;
    productName: string;
    imageUrl: string;
}

function buildSearchOptions(index: IProductSearchIndex | null): ISearchOption[] {
    if (!index?.productsByName || typeof index.productsByName !== 'object') {
        return [];
    }

    const options: ISearchOption[] = [];
    for (const [productName, entries] of Object.entries(index.productsByName)) {
        if (!Array.isArray(entries)) {
            continue;
        }
        for (const entry of entries) {
            if (!entry || typeof entry.productId !== 'string') {
                continue;
            }
            options.push({
                productId: entry.productId,
                productName,
                imageUrl: typeof entry.imageUrl === 'string' ? entry.imageUrl : '',
            });
        }
    }

    return options;
}

export default function SearchBar({ placeholder = "Search…", sx, onSearchTriggered }: SearchBarProps) {
    const navigateTo = useNavigate();
    const theme = useTheme();
    const productService = ProductService.getInstance();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const [query, setQuery] = React.useState<string>('');
    const [searchOptions, setSearchOptions] = React.useState<ISearchOption[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
    const [isSearchIndexLoading, setIsSearchIndexLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        let isMounted = true;

        (async function loadSearchIndex() {
            try {
                const index = await productService.getPublicProductSearchIndex();
                if (!isMounted) {
                    return;
                }
                setSearchOptions(buildSearchOptions(index));
            } finally {
                if (isMounted) {
                    setIsSearchIndexLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    const fuse = React.useMemo(() => new Fuse(searchOptions, {
        keys: ['productName'],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 1,
    }), [searchOptions]);

    const trimmedQuery = query.trim();

    const previewResults = React.useMemo(() => {
        if (!trimmedQuery) {
            return [] as ISearchOption[];
        }
        return fuse.search(trimmedQuery, { limit: 8 }).map((result) => result.item);
    }, [fuse, trimmedQuery]);

    const allMatchedIds = React.useMemo(() => {
        if (!trimmedQuery) {
            return [] as string[];
        }
        const ids = fuse.search(trimmedQuery).map((result) => result.item.productId);
        return Array.from(new Set(ids));
    }, [fuse, trimmedQuery]);

    function openSearchResultsPage() {
        if (isSearchIndexLoading) {
            return;
        }
        if (!trimmedQuery) {
            return;
        }
        const params = new URLSearchParams();
        params.set('source', 'search');
        params.set('query', trimmedQuery);
        if (allMatchedIds.length > 0) {
            params.set('productIds', allMatchedIds.join(','));
        }
        onSearchTriggered?.();
        navigateTo(`/results?${params.toString()}`);
        setIsDropdownOpen(false);
    }

    async function openProductFromSearch(productId: string) {
        const product = await productService.getProductById(productId);
        if (!product) {
            showMessage('Unable to open this product right now', ESnackbarMsgVariant.error);
            return;
        }

        const collection = await productService.getCollection(product.collectionId);
        const collectionName = collection?.name || 'collection';
        navigateTo(getProductPath(collectionName, product.name));
        setIsDropdownOpen(false);
    }

    return (
        <ClickAwayListener onClickAway={() => setIsDropdownOpen(false)}>
            <Box component="div" sx={{ position: 'relative' }}>
                <Box component="div" sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: alpha(theme.palette.background.default, .75),
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: theme.shape.borderRadius,
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.background.default, 1),
                    },
                    width: '100%',
                    ...sx
                }}>
                    <Box
                        component="div"
                        sx= {{
                            px: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 1,
                            touchAction: 'manipulation',
                        }}>
                        <IconButton
                            size="small"
                            aria-label="open search results"
                            onClick={openSearchResultsPage}
                            disabled={isSearchIndexLoading || !trimmedQuery}
                        >
                            <SearchIcon />
                        </IconButton>
                    </Box>
                    <InputBase
                        sx={{
                            color: 'inherit',
                            width: '100%',
                            flexGrow: 1,
                            padding: theme.spacing(1, 1, 1, 1.5),
                        }}
                        placeholder={placeholder}
                        inputProps={{ 'aria-label': 'search', maxLength: MAX_SEARCH_QUERY_LENGTH }}
                        value={query}
                        disabled={isSearchIndexLoading}
                        onFocus={() => {
                            if (!isSearchIndexLoading) {
                                setIsDropdownOpen(true);
                            }
                        }}
                        onChange={(event) => {
                            setQuery(event.target.value.slice(0, MAX_SEARCH_QUERY_LENGTH));
                            setIsDropdownOpen(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                openSearchResultsPage();
                            }
                        }}
                    />
                </Box>

                {isDropdownOpen && trimmedQuery.length > 0 && (
                    <Paper
                        elevation={6}
                        sx={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 2200,
                            maxHeight: 360,
                            overflowY: 'auto',
                        }}
                    >
                        {previewResults.length === 0 ? (
                            <Box sx={{ p: 1.25 }}>
                                <Typography variant="body2" color="text.secondary">No matching products</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                {previewResults.map((result) => (
                                    <Box
                                        key={`${result.productId}-${result.productName}`}
                                        onClick={() => openProductFromSearch(result.productId)}
                                        sx={{
                                            px: 1,
                                            py: 0.75,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: theme.palette.action.hover,
                                            },
                                        }}
                                    >
                                        <Avatar
                                            src={result.imageUrl || undefined}
                                            alt={result.productName}
                                            variant="rounded"
                                            sx={{ width: 36, height: 36 }}
                                        />
                                        <Typography variant="body2" noWrap>{result.productName}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                )}
            </Box>
        </ClickAwayListener>
    );
}