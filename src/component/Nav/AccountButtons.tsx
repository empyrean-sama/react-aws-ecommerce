import React from "react";
import { Button, ButtonGroup, SxProps,  } from "@mui/material";
import { Theme } from "@emotion/react";

export interface AccountButtonProps {
    isLoggedIn: boolean;
    setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
    sx?: SxProps<Theme>;
}

export default function AccountButtons({ isLoggedIn, setIsLoggedIn, sx }: AccountButtonProps) {
    return (
        <ButtonGroup variant="text" color="inherit" sx={sx}>
            {isLoggedIn ? null : <Button>Login</Button>}
            {isLoggedIn ? null : <Button>Register</Button>}
            {isLoggedIn ? <Button>Account</Button> : null}
            {isLoggedIn ? <Button>Logout</Button> : null}
        </ButtonGroup>
    );
}