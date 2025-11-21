import React from "react";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";

export default function AppThemeProvider(props: React.PropsWithChildren) {
    
    const theme = createTheme({
        palette: {
            primary: {
                main: '#030303',
                contrastText: '#fff'
            },
            background: {
                default: '#f7f7f7'
            }
        },
        typography: {
            fontFamily: "Karla, sans-serif",
            h1: {
                fontFamily: "Asul, serif",
                fontWeight: 400,
                fontSmooth: "antialiased",
                fontSize: '30px',
                marginBottom: '18.75px',
                [createTheme().breakpoints.up('md')]: {
                    fontSize: '36px',
                    marginBottom: '22.5px'
                },
            },
            h2: {
                fontWeight: 700,
                fontSmooth: "antialiased",
                fontSize: '30px',
                marginBottom: '18.75px',
            },
            h3: {
                fontFamily: "Asul, serif",
                fontSize: "26px",
                fontWeight: 400,
                fontSmooth: "antialiased",
                lineHeight: "35.75px",
            },
            h6: {
                fontWeight: 700,
                fontSmooth: "antialiased",
                fontSize: '18px',
                lineHeight: 1.2,
                letterSpacing: '0.2px',
                marginBottom: 0,
                [createTheme().breakpoints.up('md')]: {
                    fontSize: '20px'
                }
            },
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        fontFamily: "Karla, sans-serif",
                        fontWeight: 700,
                        fontSmooth: "antialiased",
                        fontSize: '13px',
                        padding: '15px 45px',
                        letterSpacing: '1.95px'
                    },
                    sizeSmall: {
                        fontSize: '12px',
                        padding: '6px 10px',
                        letterSpacing: '0.5px',
                        minHeight: '28px'
                    }
                },
            },
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: '30px',
                        [createTheme().breakpoints.up('md')]: {
                            padding: '45px'
                        },
                        ":last-child": {
                            padding: '30px',
                            [createTheme().breakpoints.up('md')]: {
                                padding: '45px'
                            },
                        }
                    },
                },
            }
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