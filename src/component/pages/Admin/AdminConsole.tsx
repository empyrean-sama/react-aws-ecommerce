import React, {useState, useEffect, useContext} from "react";
import CollectionsPanel from "./CollectionsPanel";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Collapse, IconButton, Tooltip } from "@mui/material";
import ItemAndVariantPanel from "./ItemAndVariantPanel";
import ProductService from "../../../service/ProductService";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ICollectionRecord from "../../../interface/product/ICollectionRecord";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";


export default function AdminConsole() {

	// Global API
	const globalAPI = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
	const productService = ProductService.getInstance();

	// State variables
	const [collections, setCollections] = useState<Array<ICollectionRecord>>([]);
	const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
	const [isAdminPanelLoading, setIsAdminPanelLoading] = useState<boolean>(false);
	const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState<boolean>(false);
	const [newCollectionName, setNewCollectionName] = useState<string>("");
	const [newCollectionDescription, setNewCollectionDescription] = useState<string>("");
	const [isCreatingCollection, setIsCreatingCollection] = useState<boolean>(false);
	const [isCollectionsPanelOpen, setIsCollectionsPanelOpen] = useState<boolean>(true);

	async function reloadCollections() {
		try {
			setIsAdminPanelLoading(true);
			const result = await productService.listCollections();
			setCollections(result ?? []);
		} catch (error) {
			console.error("Failed to load collections", error);
			globalAPI.showMessage("Failed to load collections", ESnackbarMsgVariant.error);
		} finally {
			setIsAdminPanelLoading(false);
		}
	}

	function handleAddCollection() {
		setNewCollectionName("");
		setNewCollectionDescription("");
		setIsCreateCollectionOpen(true);
	}

	function handleCloseCreateCollectionDialog() {
		if (isCreatingCollection) {
			return;
		}
		setIsCreateCollectionOpen(false);
	}

	async function handleCreateCollectionConfirm() {
		const name = newCollectionName.trim();
		const description = newCollectionDescription.trim();
		if (!name) {
			return;
		}

		try {
			setIsCreatingCollection(true);
			setIsAdminPanelLoading(true);
			const created = await productService.createCollection({
				name,
				description,
			});
			setCollections((prev) => [...prev, created]);
			setSelectedCollections([created.collectionId]);
			globalAPI.showMessage("Collection created successfully", ESnackbarMsgVariant.success);
			setIsCreateCollectionOpen(false);
		} catch (error: any) {
			console.error("Failed to create collection", error);
			const msg = error?.message || "Failed to create collection";
			globalAPI.showMessage(msg, ESnackbarMsgVariant.error);
		} finally {
			setIsCreatingCollection(false);
			setIsAdminPanelLoading(false);
		}
	}

	async function handleDeleteSelectedCollections() {
		if (!selectedCollections || selectedCollections.length === 0) {
			return;
		}

		const confirmed = window.confirm(
			`Delete ${selectedCollections.length} selected collection(s)? This will also delete all items and variants within them.`,
		);
		if (!confirmed) {
			return;
		}

		try {
			setIsAdminPanelLoading(true);
			for (const id of selectedCollections) {
				await productService.deleteCollection(id);
			}
			setCollections((prev) => prev.filter((c) => !selectedCollections.includes(c.collectionId)));
			setSelectedCollections([]);
			globalAPI.showMessage("Selected collections deleted", ESnackbarMsgVariant.success);
		} catch (error: any) {
			console.error("Failed to delete collections", error);
			const msg = error?.message || "Failed to delete collections";
			globalAPI.showMessage(msg, ESnackbarMsgVariant.error);
			// Ensure UI reflects backend state on partial failures
			await reloadCollections();
		} finally {
			setIsAdminPanelLoading(false);
		}
	}

	// Effects
	useEffect(() => {
		let isMounted = true;
		(async function() {
			try {
				setIsAdminPanelLoading(true);
				const result = await productService.listCollections();
				if (isMounted) {
					setCollections(result ?? []);
				}
			} catch (error) {
				console.error("Failed to load collections", error);
				globalAPI.showMessage("Failed to load collections", ESnackbarMsgVariant.error);
			} finally {
				if (isMounted) {
					setIsAdminPanelLoading(false);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<>
			<Box sx={{ display: "flex", width: "100%", position: "relative" }}>
				<Collapse
					in={isCollectionsPanelOpen}
					orientation="horizontal"
					collapsedSize={0}
					sx={{ display: "flex", alignItems: "stretch" }}
				>
					<CollectionsPanel
						selectedCollections={selectedCollections}
						setSelectedCollections={setSelectedCollections}
						collections={collections}
						isLoading={isAdminPanelLoading}
						onAddCollection={handleAddCollection}
						onDeleteSelectedCollections={handleDeleteSelectedCollections}
						onClosePanel={() => setIsCollectionsPanelOpen(false)}
					/>
				</Collapse>
				<ItemAndVariantPanel selectedCollectionIds={selectedCollections} allCollections={collections} />
				{!isCollectionsPanelOpen && (
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
								onClick={() => setIsCollectionsPanelOpen(true)}
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
				)}
			</Box>
			<Dialog
				open={isCreateCollectionOpen}
				onClose={handleCloseCreateCollectionDialog}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>Create New Collection</DialogTitle>
				<DialogContent sx={{ pt: 1 }}>
					<TextField
						margin="dense"
						label="Name"
						fullWidth
						required
						value={newCollectionName}
						onChange={(e) => setNewCollectionName(e.target.value)}
						autoFocus
					/>
					<TextField
						margin="dense"
						label="Description"
						fullWidth
						multiline
						minRows={2}
						value={newCollectionDescription}
						onChange={(e) => setNewCollectionDescription(e.target.value)}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCreateCollectionDialog} disabled={isCreatingCollection}>
						Cancel
					</Button>
					<Button
						color="primary"
						variant="contained"
						onClick={handleCreateCollectionConfirm}
						disabled={isCreatingCollection || !newCollectionName.trim()}
					>
						Create
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}