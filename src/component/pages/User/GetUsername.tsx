import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField, Box } from "@mui/material";
import CountryPhoneCodeSelect from '../../ui/SelectCountryDialCode';

export interface GetUsernameProps {
    usernameType: 'email' | 'phone';
    setUsernameType: React.Dispatch<React.SetStateAction<'email' | 'phone'>>;

    username: string;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    
    usernameError: string;
    loading: boolean;
}

export default function GetUsername(props: GetUsernameProps) {

    // State
    const [phone, setPhone] = React.useState<string>('');
    const [selectedDialCode, setSelectedDialCode] = React.useState<string>('+91'); // start with the republic of india dial code as default

    function handleDialCodeChange(newDialCode: string) {
        setSelectedDialCode(newDialCode);
        props.setUsername(newDialCode + phone);
    }

    return (
        <>
            <FormControl fullWidth disabled={props.loading}>
                <InputLabel id="signup-identifier-type-label">Sign up with</InputLabel>
                <Select
                    labelId="signup-identifier-type-label"
                    id="signup-identifier-type"
                    value={props.usernameType}
                    label="Sign up with"
                    onChange={(e) => props.setUsernameType(e.target.value as 'email' | 'phone')}
                >
                    <MenuItem value={'email'}>Email</MenuItem>
                    <MenuItem value={'phone'}>Phone</MenuItem>
                </Select>
            </FormControl>

            {props.usernameType === 'email' ? 
                <TextField
                    fullWidth
                    id="signup-with-email"
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email address"
                    value={props.username}
                    onChange={(e) => props.setUsername(e.target.value)}
                    variant="outlined"
                    disabled={props.loading}
                    error={!!props.usernameError}
                    helperText={props.usernameError}
                /> : undefined
            }

            {props.usernameType === 'phone' ? 
            <Box sx={{ display: 'flex', gap: 2, flexDirection: {xs: 'column', sm: 'row'} }}>
                <CountryPhoneCodeSelect selectedDialCode={selectedDialCode} onSelectionChange={handleDialCodeChange} />
                <TextField 
                    placeholder='Enter phone number' 
                    fullWidth 
                    value={phone} 
                    onChange={(e) => {
                        const newPhone = e.target.value;
                        setPhone(newPhone);
                        props.setUsername(selectedDialCode + newPhone);
                    }}
                />
            </Box> : undefined
            }
        </>
    );
}