import React, { useContext, useState } from "react";
import PageShell from "./PageShell";
import { Typography, Box, Button, TextField } from "@mui/material";
import { Link } from "react-router";
import GoogleSharpIcon from "../../ui/icons/GoogleSharpIcon";
import FacebookSharpIcon from '../../ui/icons/FacebookSharpIcon';
import AuthService from "../../../service/AuthService";
import IAppGlobalStateContextAPI from "../../../interface/IAppGlobalStateContextAPI";
import { appGlobalStateContext } from "../../App/AppGlobalStateProvider";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { showMessage } = useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    const handleSignUp = async () => {
        console.log("Sign up button clicked");

        showMessage("Sign up successful", ESnackbarMsgVariant.info, null);

        // setError("");

        // // Validation
        // if (!email || !password || !confirmPassword || !firstName || !lastName) {
        //     setError("All fields are required");
        //     return;
        // }

        // if (password !== confirmPassword) {
        //     setError("Passwords do not match");
        //     return;
        // }

        // if (password.length < 8) {
        //     setError("Password must be at least 8 characters long");
        //     return;
        // }

        // try {
        //     setLoading(true);
        //     const authService = AuthService.getInstance();
        //     const result = await authService.signUp({
        //         username: email,
        //         password: password,
        //         givenName: firstName,
        //         familyName: lastName
        //     });

        //     console.log("Sign up successful:", result);
        //     // TODO: Navigate to confirmation page or show success message
        // } catch (err: any) {
        //     console.error("Sign up error:", err);
        //     setError(err.message || "Failed to sign up. Please try again.");
        // } finally {
        //     setLoading(false);
        // }
    };

    return (
        <PageShell pageLabel="Sign Up">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                        fullWidth
                        id="signup-firstname-input"
                        label="First Name"
                        type="text"
                        placeholder="Enter your first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        variant="outlined"
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        id="signup-lastname-input"
                        label="Last Name"
                        type="text"
                        placeholder="Enter your last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        variant="outlined"
                        disabled={loading}
                    />
                </Box>
                <TextField
                    fullWidth
                    id="signup-email-input"
                    label="Email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    disabled={loading}
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
                    helperText="Minimum 8 characters with uppercase, lowercase, and numbers"
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
                />

                {error && (
                    <Typography variant="body2" color="error" textAlign="center">
                        {error}
                    </Typography>
                )}

                <Button 
                    variant="contained" 
                    color="primary"
                    size="large" 
                    onClick={handleSignUp}
                    fullWidth
                    disabled={loading}
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </Button>
            </Box>

            <Box mt={3}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Already have an account? <Link to="/account/login">Sign In</Link>
                </Typography>
            </Box>
        </PageShell>
    );
}