import React from 'react';
import AuthService from '../../../service/AuthService';
import { useNavigate } from 'react-router';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';

import { Box, TextField, Button, Typography } from '@mui/material';
import PageShell from './PageShell';

import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';
import { getErrorMessage, isUsernameValid } from '../../../Helper';
import UserNotVerifiedException from '../../../error/UserNotVerifiedException';

export default function ForgotPassword() {
    // State variables
    const [username, setUsername] = React.useState<string>('');
    const [usernameErrorMessage, setUsernameErrorMessage] = React.useState<string>('');
    const [loading, setLoading] = React.useState<boolean>(false);

    // Services & Global API
    const authService = AuthService.getInstance();
    const navigate = useNavigate();
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Private routines
    async function handleSendResetCode(): Promise<void> {
        setLoading(true);
        const validity = isUsernameValid(username);
        if(validity.isValid) {
            setUsernameErrorMessage('');
            try {
                await authService.resetPassword(username.trim());
                showMessage('Reset code sent successfully', ESnackbarMsgVariant.success);
                navigate('/account/forgot-password/verify', { state: { username: username.trim() }, replace: true });
            } catch (error) {
                if(error instanceof UserNotVerifiedException) {
                    navigate('/account/verify-username', { state: { username: username.trim() }, replace: true });
                    return;
                }
                const message = getErrorMessage(error);
                setUsernameErrorMessage(message);
            } finally {
                setLoading(false);
            }
        }
        else {
            setUsernameErrorMessage(validity.errorMessage);
            setLoading(false);
        }
    }

    return (
        <PageShell pageLabel='Forgot Password' showBackButton backTo='/account/login'>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant='body2' color='text.secondary' textAlign='center'>
                    Enter your username (email or phone) to receive a password reset code.
                </Typography>
                <TextField
                    fullWidth
                    id='forgot-password-username-input'
                    label='Username'
                    type='text'
                    placeholder='Enter your email or phone'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant='outlined'
                    error={!!usernameErrorMessage}
                    helperText={usernameErrorMessage}
                    disabled={loading}
                />
                <Button 
                    variant='contained'
                    color='primary'
                    size='large'
                    onClick={handleSendResetCode}
                    fullWidth
                    disabled={loading}
                >
                    {loading ? 'Sending Code...' : 'Send Reset Code'}
                </Button>
            </Box>
        </PageShell>
    );
}
