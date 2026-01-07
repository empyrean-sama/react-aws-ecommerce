import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";

import { TextField, Button, Box, Typography, Divider, InputAdornment, IconButton } from "@mui/material";
import PageShell from "./PageShell";

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { isFirstNameValid, isLastNameValid, isPasswordValid } from "../../../Helper";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

export default function CustomizeProfile() {
    const navigateTo = useNavigate();
    const { authService, showMessage, refreshLoggedInDetails } = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Form State
    const [givenName, setGivenName] = useState("");
    const [familyName, setFamilyName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Errors
    const [givenNameError, setGivenNameError] = useState("");
    const [familyNameError, setFamilyNameError] = useState("");
    const [currentPasswordError, setCurrentPasswordError] = useState("");
    const [newPasswordError, setNewPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");

    useEffect(() => {
        (async () => {
            const userDetails = await authService.getCurrentUser();
            if (!userDetails) {
                navigateTo("/account/login", { replace: true });
                return;
            }
            setGivenName(userDetails.givenName || "");
            setFamilyName(userDetails.familyName || "");
        })();
    }, []);

    async function handleSave() {
        setGivenNameError("");
        setFamilyNameError("");
        setCurrentPasswordError("");
        setNewPasswordError("");
        setConfirmPasswordError("");

        let isValid = true;

        const firstNameValidation = isFirstNameValid(givenName);
        if (!firstNameValidation.isValid) {
            setGivenNameError(firstNameValidation.errorMessage);
            isValid = false;
        }

        const lastNameValidation = isLastNameValid(familyName);
        if (!lastNameValidation.isValid) {
            setFamilyNameError(lastNameValidation.errorMessage);
            isValid = false;
        }

        if (!currentPassword) {
            setCurrentPasswordError("Current password is required to save changes");
            isValid = false;
        }

        if (newPassword) {
            const passwordValidation = isPasswordValid(newPassword);
            if (!passwordValidation.isValid) {
                setNewPasswordError(passwordValidation.errorMessage);
                isValid = false;
            }

            if (newPassword !== confirmNewPassword) {
                setConfirmPasswordError("Passwords do not match");
                isValid = false;
            }
        }

        if (!isValid) {
            return;
        };

        setIsLoading(true);

        try {
            await authService.updateProfile(currentPassword, {
                givenName: givenName,
                familyName: familyName
            });

            if (newPassword) {
                await authService.updatePassword(currentPassword, newPassword);
            }

            showMessage("Profile updated successfully", ESnackbarMsgVariant.success);
            await refreshLoggedInDetails();
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");

            navigateTo("/account", { replace: true });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("Incorrect username or password") || error.message.includes("Current password is incorrect")) {
                    setCurrentPasswordError("Incorrect password");
                } else {
                    showMessage(error.message, ESnackbarMsgVariant.error);
                }
            } else {
                showMessage("An error occurred while updating profile", ESnackbarMsgVariant.error);
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <PageShell pageLabel="Customize Profile" showBackButton={true}>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* Personal Details */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6">Personal Details</Typography>
                    <TextField
                        label="Given Name"
                        value={givenName}
                        onChange={(e) => setGivenName(e.target.value)}
                        error={!!givenNameError}
                        helperText={givenNameError}
                        fullWidth
                    />
                    <TextField
                        label="Family Name"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        error={!!familyNameError}
                        helperText={familyNameError}
                        fullWidth
                    />
                </Box>

                <Divider />

                {/* Change Password */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6">Change Password (Optional)</Typography>
                    <TextField
                        label="New Password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        error={!!newPasswordError}
                        helperText={newPasswordError}
                        fullWidth
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <TextField
                        label="Confirm New Password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        error={!!confirmPasswordError}
                        helperText={confirmPasswordError}
                        fullWidth
                        disabled={!newPassword}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

                <Divider />

                {/* Confirmation */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6" color="error">Confirmation Required</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please enter your current password to save any changes.
                    </Typography>
                    <TextField
                        label="Current Password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        error={!!currentPasswordError}
                        helperText={currentPasswordError}
                        fullWidth
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

                <Button 
                    variant="contained" 
                    onClick={handleSave} 
                    disabled={isLoading}
                    size="large"
                    sx={{ mt: 2 }}
                >
                    {isLoading ? "Saving..." : "Save Changes"}
                </Button>
            </Box>
        </PageShell>
    );
}
