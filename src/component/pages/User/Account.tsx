import React, { useEffect } from "react";
import AuthService from "../../../service/AuthService";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";

export default function Account() {

    // Global API
    const { getLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const authService = AuthService.getInstance();
    const navigateTo = useNavigate();

    // Effects
    useEffect(() => {
        // Redirect to login if not logged in
        (async () => {
            const userDetails = await authService.getCurrentUser();
            if(!userDetails) {
                navigateTo("/account/login", {replace: true});
            }
        })();
    },[getLoggedInDetails()]);

    return (
        <>
            <h1>Account Page</h1>
        </>
    );
}