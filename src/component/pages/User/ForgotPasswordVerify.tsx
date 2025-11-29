import React from 'react';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';
import { useLocation, useNavigate } from 'react-router';
import AuthService from '../../../service/AuthService';

import { Box, TextField, Typography } from '@mui/material';
import PageShell from './PageShell';
import GenerateAndConfirmButtonGroup from './GenerateAndConfirmButtonGroup';

import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';

import { isUsernameValid, isVerificationCodeValid, isPasswordValid } from '../../../Helper';

export default function ForgotPasswordVerify() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showMessage, setLoggedInDetails } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // State variables
    const [username, setUsername] = React.useState<string>(location.state?.username || '');
    const [usernameErrorMessage, setUsernameErrorMessage] = React.useState<string>('');
    const [verificationCode, setVerificationCode] = React.useState<string>('');
    const [verificationCodeErrorMessage, setVerificationCodeErrorMessage] = React.useState<string>('');
    const [newPassword, setNewPassword] = React.useState<string>('');
    const [newPasswordErrorMessage, setNewPasswordErrorMessage] = React.useState<string>('');
    const [confirmPassword, setConfirmPassword] = React.useState<string>('');
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = React.useState<string>('');

    // Computed properties
    const disableUsernameField: boolean = !!(location.state?.username);

    // Services
    const authService = AuthService.getInstance();

    // Private routines
    async function handleGenerateResetCode(): Promise<void> {
        const usernameValidity = isUsernameValid(username);
        if(usernameValidity.isValid) {
            setUsernameErrorMessage('');
            try {
                await authService.resetPassword(username.trim());
                showMessage('Reset code sent successfully', ESnackbarMsgVariant.success);
            } catch (error) {
                if(error instanceof Error) {
                    showMessage(error.message, ESnackbarMsgVariant.error);
                }
            }
        } else {
            setUsernameErrorMessage(usernameValidity.errorMessage);
        }
    }

    async function handleSubmitReset(): Promise<void> {
        const usernameValidity = isUsernameValid(username);
        const verificationCodeValidity = isVerificationCodeValid(verificationCode);
        const newPasswordValidity = isPasswordValid(newPassword);
        const confirmPasswordMismatch = newPassword !== confirmPassword ? 'Passwords do not match' : '';

        setUsernameErrorMessage(usernameValidity.errorMessage);
        setVerificationCodeErrorMessage(verificationCodeValidity.errorMessage);
        setNewPasswordErrorMessage(newPasswordValidity.errorMessage);
        setConfirmPasswordErrorMessage(confirmPasswordMismatch);

        if(usernameValidity.isValid && verificationCodeValidity.isValid && newPasswordValidity.isValid && !confirmPasswordMismatch) {
            try {
                await authService.confirmResetPassword(username.trim(), verificationCode.trim(), newPassword);
                showMessage('Password reset successful', ESnackbarMsgVariant.success);
                // Auto login then navigate to account
                try {
                    const loginDetails = await authService.signIn(username.trim(), newPassword);
                    setLoggedInDetails(loginDetails);
                    navigate('/account', { replace: true });
                } catch (error) {
                    navigate('/account/login', { replace: true });
                }
            } catch (error) {
                if(error instanceof Error) {
                    setVerificationCodeErrorMessage(error.message);
                }
            }
        } else {
            showMessage('Please correct the highlighted errors.', ESnackbarMsgVariant.error);
        }
    }

    return (
        <PageShell pageLabel='Reset Your Password' showBackButton backTo='/account/forgot-password'>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='body2' color='text.secondary' textAlign='center'>
                    Enter the 6-digit reset code and choose a new password.
                </Typography>
                <TextField
                    fullWidth
                    id='forgot-password-verify-username-input'
                    label='Username'
                    type='email or phone'
                    placeholder='Enter your username'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant='outlined'
                    error={!!usernameErrorMessage}
                    helperText={usernameErrorMessage}
                    disabled={disableUsernameField}
                />
                <TextField
                    fullWidth
                    id='forgot-password-verify-code-input'
                    label='Reset Code'
                    type='text'
                    placeholder='Enter 6-digit code'
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    variant='outlined'
                    error={!!verificationCodeErrorMessage}
                    helperText={verificationCodeErrorMessage}
                    slotProps={{ htmlInput: { maxLength: 6 } }}
                />
                <TextField
                    fullWidth
                    id='forgot-password-new-input'
                    label='New Password'
                    type='password'
                    placeholder='Enter new password'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    variant='outlined'
                    error={!!newPasswordErrorMessage}
                    helperText={newPasswordErrorMessage || 'Minimum 8 characters with uppercase, lowercase, and numbers'}
                />
                <TextField
                    fullWidth
                    id='forgot-password-confirm-input'
                    label='Confirm New Password'
                    type='password'
                    placeholder='Re-enter new password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    variant='outlined'
                    error={!!confirmPasswordErrorMessage}
                    helperText={confirmPasswordErrorMessage}
                />
                <GenerateAndConfirmButtonGroup
                    generateVerificationCodeLabel='Send Reset Code'
                    submitVerificationCodeLabel='Reset Password'
                    handleGenerateVerificationCode={handleGenerateResetCode}
                    handleSubmitVerificationCode={handleSubmitReset}
                />
            </Box>
        </PageShell>
    );
}
