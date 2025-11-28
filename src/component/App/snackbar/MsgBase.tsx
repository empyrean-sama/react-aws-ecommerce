import React, { forwardRef } from "react";
import { Box, LinearProgress, IconButton, Typography } from "@mui/material";
import { CustomContentProps, closeSnackbar } from "notistack";
import ESnackbarMsgVariant from "../../../enum/ESnackbarMsgVariant";

import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

const MsgBase = forwardRef<HTMLDivElement, CustomContentProps>((props, ref) => {
    const duration = props.autoHideDuration || null;
    const [progress, setProgress] = React.useState(duration ? 100 : 0);

    const IconComponent = {
        info: InfoIcon,
        success: CheckCircleIcon,
        warning: WarningIcon,
        error: ErrorIcon,
    }[props.variant as ESnackbarMsgVariant];

    React.useEffect(() => {
        if (duration != null) {
            const maxTime = duration - (duration * .25); // 25% less than total duration
            let timer = maxTime;
            const step = 50;

            function setProgressValue() {
                setProgress(Math.max((timer / maxTime) * 100, 0));
                timer -= step;
                calculateDuration = setTimeout(setProgressValue, step);
            }

            let calculateDuration = setTimeout(setProgressValue, step);
            return () => clearTimeout(calculateDuration);
        };
    }, [])

    return (
        <Box
            ref={ref}
            sx={(theme) => ({ 
                backgroundColor: theme.palette[props.variant as ESnackbarMsgVariant].main,
                color: theme.palette[props.variant as ESnackbarMsgVariant].contrastText, 
                padding: theme.spacing(1.5, 2),
                borderRadius: theme.shape.borderRadius,
                minWidth: { xs: '100%', sm: '300px' },
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing(1),
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)'
            })}
        >
            <IconComponent />
            <Typography sx={{ flex: 1 }}>{props.message}</Typography>
            <IconButton 
                size="small" 
                color="inherit" 
                aria-label="close notification" 
                onClick={() => closeSnackbar(props.id)}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={(theme) => ({
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: theme.spacing(.5),
                    backgroundColor: 'transparent',
                    '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette[props.variant as ESnackbarMsgVariant].contrastText,
                    },
                })}
            />
        </Box>
    );
})
MsgBase.displayName = 'MsgBase';
export default MsgBase;