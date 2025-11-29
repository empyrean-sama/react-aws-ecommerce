import React, { useContext } from "react";
import { Button, ButtonGroup, SxProps,  } from "@mui/material";
import { Theme } from "@emotion/react";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../interface/IAppGlobalStateContextAPI";

export interface AccountButtonProps {
    sx?: SxProps<Theme>;
}

export default function AccountButtons({ sx }: AccountButtonProps) {
    const navigateTo = useNavigate();
    const { getLoggedInDetails, logout } = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const isLoggedIn = getLoggedInDetails() !== null;
    
    return (
        <ButtonGroup variant="text" color="inherit" sx={sx}>
            {isLoggedIn ? null : <Button onClick={() => navigateTo("/account/login", {state: { from: window.location.pathname }})}>Login</Button>}
            {isLoggedIn ? null : <Button onClick={() => navigateTo("/account/signup")}>Register</Button>}
            {isLoggedIn ? <Button onClick={() => navigateTo("/account")}>Account</Button> : null}
            {isLoggedIn ? <Button onClick={logout}>Logout</Button> : null}
        </ButtonGroup>
    );
}