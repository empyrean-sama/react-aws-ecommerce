import React, { useState } from 'react';

import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import Typography from '@mui/material/Typography';

export interface IGenerateAndConfirmButtonGroupProps {
    handleGenerateVerificationCode: () => Promise<void>
    handleSubmitVerificationCode: () => Promise<void>

    generateVerificationCodeLabel: string;
    submitVerificationCodeLabel: string;
}

export default function GenerateAndConfirmButtonGroup(props: IGenerateAndConfirmButtonGroupProps) {
    const [submitVerificationCodeLoading, setSubmitVerificationCodeLoading] = useState<boolean>(false);
    const [genVerificationCodeLoading,  setGenVerificationCodeLoading]  = useState<boolean>(false);
    const [genVerificationCodeCoolDown, setGenVerificationCodeCoolDown] = useState<boolean>(false);

    async function onGenerateVerificationCode() {
        setGenVerificationCodeLoading(true);
        setGenVerificationCodeCoolDown(true);
        setTimeout(() => setGenVerificationCodeCoolDown(false), 45000);

        try {
            await props.handleGenerateVerificationCode();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
        } finally {
            setGenVerificationCodeLoading(false);
        }
    }

    async function onSubmitVerificationCode() {
        setSubmitVerificationCodeLoading(true);
        try {
            await props.handleSubmitVerificationCode();
        } finally {
            setSubmitVerificationCodeLoading(false);
        }
    }

    return (
        <>
            <Typography variant="body2" sx={{ mt: 1 }} component="p" textAlign='center'>
                You can try to create a verification code once every <Typography color="info" component='span'>45</Typography> seconds.
            </Typography>
            <ButtonGroup variant="text" aria-label="Loading button group">
                <Button 
                    loading={genVerificationCodeLoading} 
                    disabled={genVerificationCodeCoolDown}
                    onClick={onGenerateVerificationCode}
                    variant="outlined"
                    fullWidth
                    size='large'
                >
                    {props.generateVerificationCodeLabel}
                </Button>
                <Button 
                    loading={submitVerificationCodeLoading}
                    variant="contained" 
                    onClick={onSubmitVerificationCode}
                    fullWidth
                >
                    {props.submitVerificationCodeLabel}
                </Button>
            </ButtonGroup>
        </>
    );
}