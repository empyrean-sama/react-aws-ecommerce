import React from "react";
import { Paper, Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import IAddressRecord from "../../../interface/IAddressRecord";

import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export interface AddressCardProps {
    address: IAddressRecord;
    onEdit: () => void;
    onDelete: () => void;
    isBusy?: boolean;
}

export default function AddressCard({ address, onEdit, onDelete, isBusy }: AddressCardProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1.5,
                transition: (theme) => theme.transitions.create(["box-shadow", "transform"], { duration: theme.transitions.duration.shorter }),
                "&:hover": {
                    boxShadow: 2,
                    transform: "translateY(-1px)",
                },
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" component="div">
                        {address.userLabel}
                    </Typography>
                    <Chip label={address.postcode} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {address.specificAddress}
                    {address.street && <>, {address.street}</>}
                    {address.area && <>, {address.area}</>}
                    <br />
                    {address.city && <>{address.city}, </>}
                    {address.state && <>{address.state}, </>}
                    {address.country && <>{address.country}</>}
                </Typography>
                {address.placeId && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Linked location
                    </Typography>
                )}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, minWidth: 80 }}>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Edit">
                        <span>
                            <IconButton size="small" onClick={onEdit} disabled={isBusy}>
                                <EditLocationAltIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <span>
                            <IconButton size="small" color="error" onClick={onDelete} disabled={isBusy}>
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>
    );
}
