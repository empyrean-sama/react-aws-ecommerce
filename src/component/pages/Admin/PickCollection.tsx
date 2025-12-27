import React from "react";

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import ICollectionRecord from "../../../interface/product/ICollectionRecord";

export interface IPickCollectionProps {
    currentCollectionId: string | undefined;
    onCollectionPick: (collectionId: string) => void;
    collections: ICollectionRecord[];
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function PickCollection(props: IPickCollectionProps) {

  const handleChange = (event: SelectChangeEvent) => {
    props.onCollectionPick(event.target.value);
  };

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
      <InputLabel id="demo-select-small-label">Collection</InputLabel>
      <Select
        labelId="demo-select-small-label"
        id="demo-select-small"
        value={props.currentCollectionId}
        label="Collection"
        onChange={handleChange}
        MenuProps={MenuProps}
      >
        {props.collections.map((collection) => (
            <MenuItem key={collection.collectionId} value={collection.collectionId}>{collection.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}