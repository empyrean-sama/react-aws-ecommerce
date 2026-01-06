import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router";
import AuthService from "../../../service/AuthService";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";

import { Typography, Box, Button, TextField, Tooltip } from "@mui/material";
import PageShell from "./PageShell";
import GetUsername from "./GetUsername";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

import { isEmailValid, isFirstNameValid, isLastNameValid, isPhoneValid, isPasswordValid } from "../../../Helper";
import UserAlreadyExistsException from "../../../error/UserAlreadyExistsException";

export default function SignUp() {

    // State variables
    const [username, setUsername] = useState("");
    const [usernameType, setUsernameType] = useState<'email' | 'phone'>('email');
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [firstNameError, setFirstNameError] = useState("");
    const [lastName, setLastName] = useState("");
    const [lastNameError, setLastNameError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Global API
    const authService = AuthService.getInstance();
    const { showMessage } = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;
    const navigation = useNavigate();

    // Private routines
    const handleSignup = async () => {
        setLoading(true);

        // Validate first & last names
        const firstNameValidation = isFirstNameValid(firstName);
        const lastNameValidation = isLastNameValid(lastName);
        setFirstNameError(firstNameValidation.errorMessage);
        setLastNameError(lastNameValidation.errorMessage);

        // Validate username
        const usernameValidation = usernameType === 'email' ? isEmailValid(username) : isPhoneValid(username);
        setUsernameError(usernameValidation.errorMessage);

        // Validate password
        const passwordValidation = isPasswordValid(password);
        setPasswordError(passwordValidation.errorMessage);

        // validate confirm password
        const confirmPasswordError = password !== confirmPassword ? "Passwords do not match" : "";
        setConfirmPasswordError(confirmPasswordError);

        if(firstNameValidation.isValid && lastNameValidation.isValid && usernameValidation.isValid && passwordValidation.isValid && !confirmPasswordError) {
            // All inputs are valid, proceed with signup
            try {
                await authService.signUp({givenName: firstName.trim(), familyName: lastName.trim(), username: username.trim(), password: password});
                showMessage("Account created successfully!", ESnackbarMsgVariant.success);
                navigation("/account/verify-username", {state: {username: username.trim(), password: password}, replace: true});
            }
            catch(error) {
                if(error instanceof UserAlreadyExistsException) {
                    setUsernameError(error.message);
                }
                else if (error instanceof Error) {
                    showMessage(error.message, ESnackbarMsgVariant.error);
                }
            }
            finally {
                setLoading(false);
            }
        }
        else {
            setLoading(false);
        }
    };

    return (
        <PageShell pageLabel="Sign Up" showBackButton backTo="/account/login">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <GetNameComponent 
                    firstName={firstName} setFirstName={setFirstName} firstNameError={firstNameError} 
                    lastName={lastName} setLastName={setLastName} lastNameError={lastNameError} 
                    loading={loading} 
                />
                <GetUsername 
                    username={username} 
                    setUsername={setUsername} 
                    usernameError={usernameError} 
                    loading={loading} 
                    usernameType={usernameType} 
                    setUsernameType={setUsernameType}
                />
                <TextField
                    fullWidth
                    id="signup-password-input"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    disabled={loading}
                    error={!!passwordError}
                    helperText={passwordError || "Minimum 8 characters with uppercase, lowercase, and numbers"}
                />
                <TextField
                    fullWidth
                    id="signup-confirm-password-input"
                    label="Confirm Password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    variant="outlined"
                    disabled={loading}
                    error={!!confirmPasswordError}
                    helperText={confirmPasswordError}
                />

                <Tooltip 
                    title={usernameType === "phone" ? "Phone signup is currently disabled" : ""} 
                    arrow
                >
                    <span>
                        <Button 
                            variant="contained" 
                            color="primary"
                            size="large" 
                            onClick={handleSignup}
                            fullWidth
                            loading={loading}
                            disabled={usernameType === "phone"} //TODO: Disable until phone signup is implemented
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            <Box mt={3}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Already have an account? <Link to="/account/login">Sign In</Link>
                </Typography>
            </Box>
        </PageShell>
    );
}

interface IGetNameComponentProps {
    firstName: string;
    setFirstName: React.Dispatch<React.SetStateAction<string>>;
    firstNameError: string;

    lastName: string;
    setLastName: React.Dispatch<React.SetStateAction<string>>;
    lastNameError: string;
    
    loading: boolean;
}

function GetNameComponent(props: IGetNameComponentProps) {
    return (
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
                fullWidth
                id="signup-given-name-input"
                label="First Name"
                type="text"
                placeholder="Enter your first name"
                value={props.firstName}
                onChange={(e) => props.setFirstName(e.target.value)}
                variant="outlined"
                disabled={props.loading}
                error={!!props.firstNameError}
                helperText={props.firstNameError}
            />
            <TextField
                fullWidth
                id="signup-family-name-input"
                label="Last Name"
                type="text"
                placeholder="Enter your last name"
                value={props.lastName}
                onChange={(e) => props.setLastName(e.target.value)}
                variant="outlined"
                disabled={props.loading}
                error={!!props.lastNameError}
                helperText={props.lastNameError}
            />
        </Box>
    );
}