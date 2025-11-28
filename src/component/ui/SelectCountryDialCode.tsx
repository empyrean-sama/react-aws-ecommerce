import React from 'react';
import DialCodeMap from './CCA-DialCodes-map.json';
import { FormControl, InputLabel, Select, MenuItem, SelectProps, Typography, Box } from '@mui/material';

export interface ICountryPhoneCodeSelectProps {
    selectedDialCode: string;
    onSelectionChange: React.Dispatch<React.SetStateAction<string>>;
    selectProps?: SelectProps<string>;
}

export default function CountryPhoneCodeSelect(props: ICountryPhoneCodeSelectProps) {
    // Computed Properties
    const label = "Country Code";

    // Selectable Options
    const menuItems = React.useMemo(() =>Object.entries(DialCodeMap).map(([cca2, {name, dial}]) => {
        return (
            <MenuItem value={dial} key={cca2}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                        component="img"
                        alt={cca2}
                        loading="lazy"
                        src={`https://flagcdn.com/w40/${cca2.toLowerCase()}.webp`}   
                        sx={{ width: 24, height: 16, mr: 1 }}
                    />
                    <Typography component="span" sx={{ mr: 1 }}>{name}</Typography>
                    <Typography component="span">{dial}</Typography>
                </Box>
            </MenuItem>
        );
    }), []);

    return (
        <FormControl fullWidth>
            <InputLabel id="country-code-select-label">{label}</InputLabel>
            <Select
                labelId="country-code-select-label"
                id="country-code-select"
                label={label}
                value={props.selectedDialCode}
                onChange={(e) => props.onSelectionChange(e.target.value as string)}
                {...props.selectProps}
            >                
                {menuItems}
            </Select>
        </FormControl>
    );
}