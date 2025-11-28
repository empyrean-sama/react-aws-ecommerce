import { Typography, Box, Button, TextField } from "@mui/material";
import React, { useState } from "react";
import PageShell from "./PageShell";

import GoogleSharpIcon from "../../ui/icons/GoogleSharpIcon";
import FacebookSharpIcon from '../../ui/icons/FacebookSharpIcon';

import { Link } from "react-router";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = () => {
        console.log("Login clicked", { email, password });
    };

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
                    variant="outlined"
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
                />
                <Button 
                    variant="contained" 
                    color="primary"
                    size="large" 
                    onClick={handleLogin}
                    fullWidth
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
                        disabled={true}
                    >
                        <GoogleSharpIcon />
                        Google
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: .5 }}
                        disabled={true}
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