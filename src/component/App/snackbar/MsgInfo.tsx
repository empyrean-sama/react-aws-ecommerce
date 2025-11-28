import React, { forwardRef } from "react";
import { IconButton, Typography } from "@mui/material";
import { CustomContentProps, closeSnackbar } from "notistack";
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import MsgBase from "./MsgBase";

const MsgInfo = forwardRef<HTMLDivElement, CustomContentProps>((props, ref) => {
    return (
        <div ref={ref}>
            <MsgBase {...props}>
                <InfoIcon sx={{ flexShrink: 0 }} />
                <Typography sx={{ flex: 1 }}>{props.message}</Typography>
                <IconButton 
                    size="small" 
                    color="inherit" 
                    aria-label="close notification" 
                    onClick={() => closeSnackbar(props.id)}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </MsgBase>
        </div>
    );
});

MsgInfo.displayName = 'MsgInfo';

export default MsgInfo;