import React from "react";

import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    Box,
    Chip,
    Divider,
    Collapse,
    Avatar,
    Button,
    CardActionArea,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TableContainer,
    Paper,
    TableHead,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import EmailIcon from "@mui/icons-material/Email"; // order placed
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled"; // processing
import LocalShippingIcon from "@mui/icons-material/LocalShipping"; // shipped
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // delivered
import HighlightOffIcon from "@mui/icons-material/HighlightOff"; // cancelled

import { format } from "date-fns";
import IAddress from "../../../interface/IAddress";

type OrderStatus = "order placed" | "processing" | "shipped" | "delivered" | "cancelled";

interface ItemData {
    imageUrl: string;
    name: string;
    cost: string;
    quantity: string;
    totalCost: string;
}

interface IOrderCardProps {
    orderId: string;
    orderDate: Date;
    shippingAddress: IAddress;
    paymentMode: 'Pre Paid' | 'Cash on Delivery';
    paymentDetails: string;
    itemData: ItemData[];
    orderSubtotal: string;
    extraFees?: Record<string, string>;
    orderTotal: string;
    status: OrderStatus;
    phoneNumber: string;
    email: string;
}

function getColorAndIconByStatus(status: OrderStatus): { color: "primary" | "warning" | "info" | "success" | "error"; icon: React.ReactElement } {
    if (status === "order placed") {
        return { color: "primary", icon: <EmailIcon /> };
    }
    if (status === "processing") {
        return { color: "warning", icon: <AccessTimeFilledIcon /> };
    }
    if (status === "shipped") {
        return { color: "info", icon: <LocalShippingIcon /> };
    }
    if (status === "delivered") {
        return { color: "success", icon: <CheckCircleIcon /> };
    }
    if (status === "cancelled") {
        return { color: "error", icon: <HighlightOffIcon /> };
    }
    throw new Error("Invalid status");
}

function getProgressByStatus(status: OrderStatus): number {
    if (status === "order placed") {
        return 0;
    }
    if (status === "processing") {
        return 33;
    }
    if (status === "shipped") {
        return 66;
    }
    return 100;
}

export default function OrderCard(props: IOrderCardProps) {
    const [expanded, setExpanded] = React.useState<boolean>(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    return (
        <Card sx={{ position: "relative" }} variant="compact">
            <LinearProgress
                variant="determinate"
                value={getProgressByStatus(props.status)}
                sx={{ position: "absolute", top: 0, left: 0, right: 0 }}
                color={getColorAndIconByStatus(props.status).color}
            />

            <Box sx={{ display: "flex", flexDirection:{xs: "column", sm: "row"}, alignItems: {xs: "flex-start", sm: "center"}, justifyContent: "space-between", gap: 1, padding: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip label={props.status} color={getColorAndIconByStatus(props.status).color} size="small" icon={getColorAndIconByStatus(props.status).icon} />
                    <Chip label={props.paymentDetails} color={props.paymentMode === "Pre Paid" ? "info" : "warning"} size="small" />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button variant="outlined" size="small">Reorder</Button>
                    <Button variant="outlined" size="small">Request Support</Button>
                </Box>
                
            </Box>

            <CardActionArea onClick={handleExpandClick}>
                <CardHeader
                    avatar={
                        <Avatar aria-label="order" color={getColorAndIconByStatus(props.status).color} sx={{ backgroundColor: `${getColorAndIconByStatus(props.status).color}.main` }}>
                            {getColorAndIconByStatus(props.status).icon}
                        </Avatar>
                    }
                    title={<CardTitle />}
                    subheader={`Placed on ${format(props.orderDate, "MMMM dd, yyyy")}`}
                    action={expanded ? <ExpandLessIcon sx={{ marginY: "auto" }} /> : <ExpandMoreIcon sx={{ marginY: "auto" }} />}
                    sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                />
            </CardActionArea>

            <CardContent>
                <Collapse in={expanded} timeout="auto">
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h4" component="h2" sx={{ mb: 2, mx: {xs: 2, sm: 0} }}>Order Summary</Typography>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="a dense table">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left">Name</TableCell>
                                    <TableCell align="center" sx={{display: {xs: "none", sm: "table-cell"}}}>Quantity</TableCell>
                                    <TableCell align="center" sx={{display: {xs: "none", sm: "table-cell"}}}>Price</TableCell>
                                    <TableCell align="center" sx={{display: {xs: "table-cell", sm: "none"}}}>Nos. x Price</TableCell>
                                    <TableCell align="right">Sub Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {props.itemData.map((row) => (
                                    <TableRow key={row.name} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                        <TableCell scope="row" sx={{ display: "flex", alignItems: "center" }}>
                                            <Box component="img" src={row.imageUrl} alt={row.name} sx={{ width: { xs: 50, sm: 75, md: 100, lg: 125 }, objectFit: "contain", marginRight: 2 }} />
                                            {row.name}
                                        </TableCell>
                                        <TableCell align="center" sx={{display: {xs: "none", sm: "table-cell"}}}>{row.quantity}</TableCell>
                                        <TableCell align="center" sx={{display: {xs: "none", sm: "table-cell"}}}>{row.cost}</TableCell>
                                        <TableCell align="center" sx={{display: {xs: "table-cell", sm: "none"}}}>{row.quantity} x {row.cost}</TableCell>
                                        <TableCell align="right">{row.totalCost}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={4} align="right">
                                        <Typography variant="h5">{props.orderTotal}</Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Paper variant="elevation" sx={{ p: 2, my: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.2 }}>
                        <Typography variant="body1" component="div">
                            <Box component="div" sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                <span>Subtotal:</span>
                                <span>{props.orderSubtotal}</span>
                            </Box>
                            {props.extraFees &&
                                Object.entries(props.extraFees).map(([feeName, feeAmount]) => (
                                    <Box key={feeName} component="div" sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                        <span>{feeName}:</span>
                                        <span>{feeAmount}</span>
                                    </Box>
                                ))}
                            <Divider sx={{ my: 1 }} />
                            <Box component="div" sx={{ display: "flex", justifyContent: "space-between", gap: 2, fontWeight: "bold" }}>
                                <span>Total:</span>
                                <span>{props.orderTotal}</span>
                            </Box>
                        </Typography>
                    </Paper>

                    <Box sx={{ mx: {xs: 2, sm: 0} }}>
                        <Typography variant="h4" component="h2" sx={{ my: 2 }}>
                            Shipping Details
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="h6" component="h3" gutterBottom>
                                <strong>{props.shippingAddress.userLabel}</strong>
                            </Typography>
                            <Typography variant="body1" component="p">
                                {props.shippingAddress.specificAddress}, <br />
                                {props.shippingAddress.area}, {props.shippingAddress.street}, <br />
                                {props.shippingAddress.city} {props.shippingAddress.postcode}, <br />
                                {props.shippingAddress.state}, {props.shippingAddress.country}.
                            </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body1" component="p">
                                Contact: {props.phoneNumber}<br />
                                Email: {props.email}
                            </Typography>
                        </Paper>
                    </Box>
                </Collapse>
            </CardContent>
        </Card>
    );
}

function CardTitle() {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" component="div">
                Order #123456789
            </Typography>
        </Box>
    );
}