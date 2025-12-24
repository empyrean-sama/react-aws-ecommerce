import React, {useState} from "react";
import CollectionsPanel from "./CollectionsPanel";
import { Box, Container } from "@mui/material";
import ItemAndVariantPanel from "./ItemAndVariantPanel";

export default function AdminConsole() {
	const [selected, setSelected] = useState<string[]>([]);

	return (
		<Box sx={{ display: "flex", width: "100%" }}>
			<CollectionsPanel selected={selected} setSelected={setSelected} />
			<ItemAndVariantPanel selectedCollectionIds={selected} />
		</Box>
	);
}