import React, {useState, useEffect, useContext, PropsWithChildren} from "react";
import ProductService from "../../../../service/ProductService";
import { appGlobalStateContext } from "../../../App/AppGlobalStateProvider";

import CollectionsPanel from "./CollectionsPanel";
import { Box, Collapse, CircularProgress, IconButton, Tooltip } from "@mui/material";

import IAppGlobalStateContextAPI from "../../../../interface/IAppGlobalStateContextAPI";
import ICollectionRecord from "../../../../interface/product/ICollectionRecord";
import ESnackbarMsgVariant from "../../../../enum/ESnackbarMsgVariant";

import ChevronRightIcon from '@mui/icons-material/ChevronRight';


export interface ICatalogPageContextAPI {
	collections: ICollectionRecord[];

	selectedCollections: string[];
	setSelectedCollections: React.Dispatch<React.SetStateAction<string[]>>;

	isCollectionsPanelLoading: boolean;
	setIsCollectionsPanelLoading: React.Dispatch<React.SetStateAction<boolean>>;

	isCatalogPageLoading: boolean;
	setIsCatalogPageLoading: React.Dispatch<React.SetStateAction<boolean>>;

	isCollapsedPanelOpen: boolean;
	setIsCollapsedPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;

	reloadCollections: () => Promise<void>;
}
export const catalogPageContext = React.createContext<ICatalogPageContextAPI | null>(null);

export default function CatalogPage() {

	// Global API
	const globalAPI = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
	const productService = ProductService.getInstance();

	// State variables
	const [collections, setCollections] = useState<Array<ICollectionRecord>>([]);
	const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
	const [isCatalogPageLoading, setIsCatalogPageLoading] = useState<boolean>(true); //The use effect will set it to false after loading
	const [isCollectionsPanelLoading, setIsCollectionsPanelLoading] = useState<boolean>(false);
	const [isCollapsedPanelOpen, setIsCollapsedPanelOpen] = useState<boolean>(true);

	// Routines
	async function reloadCollections() {
		try {
			setIsCollectionsPanelLoading(true);
			const result = await productService.listCollections();
			setCollections(result ?? []);
		} catch (error) {
			console.error("Failed to load collections", error);
			globalAPI.showMessage("Failed to load collections", ESnackbarMsgVariant.error);
		} finally {
			setIsCollectionsPanelLoading(true);
		}
	}

	// Effects
	useEffect(() => {
		let isMounted = true;
		(async function() {
			try {
				const result = await productService.listCollections();
				if (isMounted) {
					setCollections(result ?? []);
				}
			} catch (error) {
				console.error("Failed to load collections", error);
				globalAPI.showMessage("Failed to load collections", ESnackbarMsgVariant.error);
			} finally {
				if (isMounted) {
					setIsCatalogPageLoading(false);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<catalogPageContext.Provider value={{
			collections,
			selectedCollections,
			setSelectedCollections,
			isCollectionsPanelLoading,
			setIsCollectionsPanelLoading,
			isCatalogPageLoading,
			setIsCatalogPageLoading,
			isCollapsedPanelOpen,
			setIsCollapsedPanelOpen,
			reloadCollections,
		}}>
			<CatalogPageEnclosure isCatalogPageLoading={isCatalogPageLoading}>
				<CollapsedPanelButton isCollectionsPanelOpen={isCollapsedPanelOpen} setIsCollectionsPanelOpen={setIsCollapsedPanelOpen} />
				{/* <Box sx={{ display: "flex", width: "100%", position: "relative" }}> */}
					<Collapse
						in={isCollapsedPanelOpen}
						orientation="horizontal"
						collapsedSize={0}
						sx={{ display: "flex", alignItems: "stretch" }}
					>
						<CollectionsPanel />
					</Collapse>
				{/* </Box> */}
			</CatalogPageEnclosure>
		</catalogPageContext.Provider>
	);
}

function CatalogPageEnclosure({isCatalogPageLoading, children}: PropsWithChildren<{isCatalogPageLoading: boolean}>) {
	if(!isCatalogPageLoading){
		return (
			<Box sx={{position: "relative"}}>
				{children}
			</Box>
		);
	}
	return(
		<CircularProgress />
	);
}

function CollapsedPanelButton(props: {isCollectionsPanelOpen: boolean, setIsCollectionsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>}) {
	return (
		!props.isCollectionsPanelOpen && (
			<Box
					sx={{
					position: "absolute",
					left: 0,
					top: 72,
					bottom: 0,
					display: "flex",
					alignItems: "center",
					zIndex: 2,
				}}
			>
				<Tooltip title="Show collections panel">
					<IconButton
						size="small"
						color="primary"
						onClick={() => props.setIsCollectionsPanelOpen(true)}
						sx={{
							borderRadius: "0 20px 20px 0",
							boxShadow: 2,
							bgcolor: (theme) => theme.palette.background.paper,
						}}
					>
						<ChevronRightIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			</Box>
		)
	);
}