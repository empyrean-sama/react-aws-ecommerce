import React, { useEffect, useState } from "react";
import AuthService from "../../../service/AuthService";
import { Link, useLocation, useNavigate } from "react-router";

import { Typography, Box, Button, TextField } from "@mui/material";
import PageShell from "./PageShell";

import GoogleSharpIcon from "../../ui/icons/GoogleSharpIcon";
import FacebookSharpIcon from '../../ui/icons/FacebookSharpIcon';

import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import { isEmailValid, isPasswordValid } from "../../../Helper";
import UserNotVerifiedException from "../../../error/UserNotVerifiedException";

export default function Login() {
    
    // State variables
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);

    // Global API
    const { showMessage, setLoggedInDetails, getLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const navigate = useNavigate();
    const location = useLocation();
    const authService = AuthService.getInstance()

    // Effects
    useEffect(() => {
        // Don't allow access to login page if already logged in
        const loggedInDetails = getLoggedInDetails();
        if(loggedInDetails) {
            navigate("/account", {replace: true});
        }
    }, [getLoggedInDetails()]);

    // Private routines
    async function handleGoogleLogin() {
        if (!authService.isGoogleFederationEnabled()) {
            showMessage("Google sign-in is not configured yet.", ESnackbarMsgVariant.warning);
            return;
        }

        setLoading(true);
        try {
            const redirectPath = location.state?.from && !String(location.state.from).startsWith('/account')
                ? String(location.state.from)
                : '/account';
            await authService.signInWithGoogle(redirectPath);
        } catch (error: any) {
            setLoading(false);
            showMessage(error?.message || 'Unable to start Google sign-in.', ESnackbarMsgVariant.error);
        }
    }

    async function handleLogin() {
        setLoading(true);
        const emailValidity = isEmailValid(email);
        const passwordValidity = isPasswordValid(password);
        setEmailError(emailValidity.errorMessage);
        setPasswordError(passwordValidity.errorMessage);

        if(emailValidity.isValid && passwordValidity.isValid) {
            try {
                const loginDetails = await authService.signIn(email, password);
                showMessage("Login successful", ESnackbarMsgVariant.success);
                setLoggedInDetails(loginDetails);
                if(location.state?.from && !location.state.from.startsWith("/account")) {
                    // TODO: replace the above check with a positive check. like navigate back only if coming from collections or product pages 
                    //If login was redirected, go back to original page. don't go back to account pages
                    navigate(location.state.from, {replace: true}); 
                }
                else {
                    navigate("/account", {replace: true}); //Else go to account page
                }
            } catch (error) {
                if(error instanceof UserNotVerifiedException) {
                    showMessage("Your account is not verified. Please verify your account before logging in.", ESnackbarMsgVariant.error);
                    navigate("/account/verify-username", {state: {username: email, password: password, from: location.state?.from || null}, replace: true});
                }
                else if (error instanceof Error) {
                    setPasswordError(error.message);
                }
                else {
                    throw error; //not sure when this will get triggered, but just in case
                }
            } finally {
                setLoading(false);
            }
        }
        else {
            setLoading(false);
        }
    }

    return (
        <PageShell pageLabel="Login">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    fullWidth
                    id="signin-email-input"
                    label="Email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!emailError}
                    helperText={emailError}
                    variant="outlined"
                    disabled={loading}
                />
                <TextField
                    fullWidth
                    id="signin-password-input"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    disabled={loading}
                    error={!!passwordError}
                    helperText={passwordError}
                />
                <Button 
                    variant="contained" 
                    color="primary"
                    size="large" 
                    onClick={handleLogin}
                    fullWidth
                    disabled={loading}
                >
                    Sign In
                </Button>
            </Box>

            <Box mt={3} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Or continue with
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: .5 }}
                        onClick={handleGoogleLogin}
                        disabled={loading || !authService.isGoogleFederationEnabled()}
                    >
                        <GoogleSharpIcon />
                        Google
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: .5 }}
                        disabled={true || loading}
                    >
                        <FacebookSharpIcon />
                        Facebook
                    </Button>
                </Box>
            </Box>

            <Box mt={3} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Don't have an account? <Link to="/account/signup">Sign Up</Link> now.
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    <Link to="/account/forgot-password">Forgot Password?</Link>
                </Typography>
            </Box>
        </PageShell>
    );
}