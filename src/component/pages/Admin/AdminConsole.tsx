import React from "react";
import { Outlet, useLocation, Link as RouterLink } from "react-router";

import { Breadcrumbs, Container, Typography, Link } from "@mui/material";

export default function AdminConsole() {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <Container maxWidth="xl" sx={{mt: 1}}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
                {pathnames.map((value, index) => {
                    const last: boolean = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const name = value.charAt(0).toUpperCase() + value.slice(1);

                    return last ? (
                        <Typography color="text.primary" key={to}>{name}</Typography>
                    ) : (
                        <Link component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
                            {name}
                        </Link>
                    );
                })}
            </Breadcrumbs>
            <Outlet />
        </Container>
    )
}