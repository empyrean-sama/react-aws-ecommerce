import React, { useContext, useEffect, useMemo, useState } from 'react';
import Fuse from "fuse.js";

import OutputParser from "../../../service/OutputParser";
import { getComparator, Order, stableSort } from "./AdminConsoleHelper";

import ProductService from "../../../service/ProductService";
import AuthService from "../../../service/AuthService";

import { Box, Button, Chip, CircularProgress, Divider, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Toolbar, Typography } from '@mui/material';
import PanelShell from "./PanelShell";
import ImageCarousel from "./ImageViewer";

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import IProductRecord from "../../../interface/product/IProductRecord";
import IProduct from "../../../interface/product/IProduct";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";
import IProductVariant from "../../../interface/product/IProductVariant";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";

export default function ItemAndVariantPanel() {
    return (
        <PanelShell flexBasis='75%'>
            Implementation of Item and Variant management goes here
        </PanelShell>
    );
}