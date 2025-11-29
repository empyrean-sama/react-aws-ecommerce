import React from 'react';
import AuthService from '../../../service/AuthService';
import { useLocation, useNavigate } from 'react-router';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import { isUsernameValid, isVerificationCodeValid } from '../../../Helper';

import PageShell from './PageShell';
import { Box, TextField, Typography } from '@mui/material';
import GenerateAndConfirmButtonGroup from './GenerateAndConfirmButtonGroup';

import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';

export default function VerifyUsername() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showMessage, setLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // State variables
    const [username, setUsername] = React.useState<string>(location.state?.username || "");
    const [usernameErrorMessage, setUsernameErrorMessage] = React.useState<string>("");
    const [verificationCode, setVerificationCode] = React.useState<string>("");
    const [verificationCodeErrorMessage, setVerificationCodeErrorMessage] = React.useState<string>("");

    // Computed properties
    const disableUsernameField: boolean = !!(location.state?.username); //disable if username is passed from previous page

    // Services
    const authService = AuthService.getInstance();

    // Private routines
    async function handleGenerateVerificationCode(): Promise<void> {
        const usernameValidity = isUsernameValid(username);
        if(usernameValidity.isValid) {
            setUsernameErrorMessage("");
            try {
                await authService.resendVerificationCode(username);
                showMessage("Verification code sent successfully", ESnackbarMsgVariant.success);
            } catch (error) {
                if (error instanceof Error) {
                    showMessage(error.message, ESnackbarMsgVariant.error);
                    throw error;
                }
            }
        }
        else {
            setUsernameErrorMessage("Please enter a valid email address or phone number.");
        }
    }
    async function handleSubmitVerificationCode(): Promise<void> {
        const usernameValidity = isUsernameValid(username);
        const verificationCodeValidity = isVerificationCodeValid(verificationCode);

        if(usernameValidity.isValid && verificationCodeValidity.isValid) {
            setUsernameErrorMessage("");
            setVerificationCodeErrorMessage("");
            try {
                await authService.verifyUserAccount(username, verificationCode);
                showMessage("Account verified successfully!", ESnackbarMsgVariant.success);
            if(location.state?.username && location.state?.password) {    
                try {
                    const loginDetails = await authService.signIn(location.state.username, location.state.password);
                    setLoggedInDetails(loginDetails);
                    if(location.state?.from) {
                        navigate(location.state?.from, {replace: true}); //If login was redirected, go back to original page
                    }
                    else {
                        navigate("/account", {replace: true}); //Else go to account page
                    }
                }
                    catch (error) {
                        navigate("/account/login");
                    }
                }
                else {
                    navigate("/account/login");
                }
            } catch (error) {
                if (error instanceof Error) {
                    setVerificationCodeErrorMessage(error.message);
                }
            }
        }
        else {
            setUsernameErrorMessage(usernameValidity.errorMessage);
            setVerificationCodeErrorMessage(verificationCodeValidity.errorMessage);
            showMessage("Please enter a valid email address or phone number and verification code.", ESnackbarMsgVariant.error);
        }
    }

    return (
        <PageShell pageLabel='Verify Your Account'>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Generate & Enter the 6-digit verification code sent to your email to verify your account.
                </Typography>

                <TextField
                    fullWidth
                    id="verify-username"
                    label="Username"
                    type="email or phone"
                    placeholder="Enter your username (email or phone)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant="outlined"
                    error={!!usernameErrorMessage}
                    helperText={usernameErrorMessage}
                    disabled={disableUsernameField}
                />

                <TextField
                    fullWidth
                    id="verify-code-input"
                    label="Verification Code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    variant="outlined"
                    error={!!verificationCodeErrorMessage}
                    helperText={verificationCodeErrorMessage}
                    slotProps={{htmlInput: { maxLength: 6 }}}
                />

                <GenerateAndConfirmButtonGroup 
                    generateVerificationCodeLabel='Send Verification Code' 
                    submitVerificationCodeLabel='Verify Account'
                    handleGenerateVerificationCode={handleGenerateVerificationCode} 
                    handleSubmitVerificationCode={handleSubmitVerificationCode} 
                />
            </Box>
        </PageShell>
    );
}