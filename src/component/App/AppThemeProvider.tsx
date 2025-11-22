import React from "react";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";

export default function AppThemeProvider(props: React.PropsWithChildren) {

    const theme = createTheme({
        palette: {
            primary: {
                main: '#030303',
                light: '#333333',          
                dark: '#000000',
                contrastText: '#ffffff',   
            },
            secondary: {
                main: '#666666',
                contrastText: '#ffffff',
            },
            background: {
                default: '#f7f7f7',
                paper: '#ffffff',
            },
            text: {
                primary: '#030303',
                secondary: '#666666',
            },
            divider: '#666666',
            error: {
                main: '#d32f2f',
            },
            warning: {
                main: '#f57c00',
            },
            info: {
                main: '#1976d2',
            },
            success: {
                main: '#388e3c',
            },
        },
        typography: {
            fontFamily: 'Karla, sans-serif',
            
            h1: {
                fontFamily: 'Asul, serif',
                fontSize: '36px',
                fontWeight: 400,
                lineHeight: 1.2,
                letterSpacing: 'normal',
                color: '#030303',
            },
            h2: {
                fontFamily: 'Asul, serif',
                fontSize: '30px',
                fontWeight: 400,
                lineHeight: 1.3,
                color: '#030303',
            },
            h3: {
                fontFamily: 'Asul, serif',
                fontSize: '26px',
                fontWeight: 400,
                lineHeight: 1.4,
                color: '#030303',
            },
            h4: {
                fontSize: '22px',
                fontWeight: 400,
                lineHeight: 1.4,
            },
            h5: {
                fontSize: '18px',
                fontWeight: 400,
                lineHeight: 1.5,
            },
            h6: {
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: 1.6,
            },
            body1: {
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: 1.6,
                letterSpacing: 'normal',
            },
            body2: {
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: 1.5,
            },
            button: {
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: 1.75,
                letterSpacing: 'normal',
                textTransform: 'none',
            },
            caption: {
                fontSize: '12px',
                lineHeight: 1.66,
            },
        },
        shape: {
            borderRadius: 0,
        },
        spacing: 8,
        
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '0px',
                        padding: '0px 20px',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: 'normal',
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: 'none',
                        },
                    },
                    contained: {
                        backgroundColor: '#030303',
                        color: '#ffffff',
                        '&:hover': {
                            backgroundColor: '#444444',  
                        },
                    },
                    outlined: {
                        borderColor: '#666666',
                        color: '#666666',
                        '&:hover': {
                            borderColor: '#333333',
                            backgroundColor: 'rgba(0,0,0,0.04)',
                        },
                    },
                    sizeLarge: {
                        padding: '12px 30px',
                        fontSize: '16px',
                    },
                    sizeSmall: {
                        padding: '0px 15px',
                        fontSize: '14px',
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: '0px',
                        boxShadow: 'none',
                        padding: '0',
                        backgroundColor: '#ffffff',
                        '&:hover': {
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        },
                        [theme.breakpoints.up('xs')]: {
                            paddingTop: '32px',
                            paddingBottom: '32px'
                        },
                        [theme.breakpoints.up('sm')]: {
                            paddingLeft: '16px',
                            paddingRight: '16px',
                        },
                    }),
                },
            },
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: '0px',
                        '&:last-child': {
                            paddingBottom: '0px',
                        },
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: '#ffffff',
                        color: '#240303',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '0px',
                            '& fieldset': {
                                borderColor: '#666666',
                            },
                            '&:hover fieldset': {
                                borderColor: '#333333',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#000000',
                            },
                        },
                    },
                },
            },
            MuiLink: {
                styleOverrides: {
                    root: {
                        color: '#000000',
                        textDecoration: 'none',
                        '&:hover': {
                            color: '#666666',
                            textDecoration: 'underline',
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: '0px',
                        fontSize: '12px',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: '0px',
                    },
                    elevation1: {
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    },
                },
            },
        },
    });
    
    return (
        <ThemeProvider theme={theme}>
            <>
                <CssBaseline />
                {props.children}
            </>
        </ThemeProvider>
    );
}