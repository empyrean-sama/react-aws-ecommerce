import React from 'react';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';

import { Box, Paper, Stack, Typography } from '@mui/material';
import ProductCard from "./ProductCard";

import placeHolderImageString from 'url:./placeholderImage.png';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';

export interface IProductRackProps {
    label: string;
    children: React.ReactElement<typeof ProductCard> | Array<React.ReactElement<typeof ProductCard>>;
}

export default function ProductRack(props: IProductRackProps) {

    // Global API
    const {showMessage} = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Card State
    const [hovered, setHovered] = React.useState(false);

    // Computed Properties
    const childrenArray = React.Children.toArray(props.children) as Array<React.ReactElement<typeof ProductCard>>;
    const firstImage = (childrenArray[0] as any)?.props?.productRecord?.imageUrls[0] || placeHolderImageString;
    const labelComponents = props.label.split(' ').map((word,index) => {
        return (
            <Box key={word+index} sx={{ backgroundColor: '#000', color: '#fff', py: 1, px: 2, my: 0.2, width: 'fit-content' }}>
                {word}
            </Box>
        );
    });

    // Private Routines
    async function handleRackClick() {
        showMessage(`Clicked on rack: ${props.label}`, ESnackbarMsgVariant.info);
    }

    return (
        <Stack direction="row" spacing={1} flexWrap={'wrap'}>
            <Paper 
                sx={{
                    display: 'flex', flexDirection: 'column', gap: 1, 
                    position: "relative", cursor: 'pointer', 
                    width: { xs: 175, md: 250 }
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleRackClick}
            >
                <Box
                    component="img" 
                    src={firstImage} 
                    alt="Product Rack Banner" 
                    sx={{
                        transition: 'all 0.3s ease-in-out',
                        width: '100%', height: '100%', objectFit: 'cover',
                        filter: hovered ? 'brightness(60%) blur(3px)' : 'brightness(80%) blur(3px)',
                    }}
                />
                <Typography
                    variant="h2"
                    sx={{
                        position: 'absolute',
                        bottom: '10%',
                        left: '0',
                        overflowX: 'hidden',
                        overflowY: 'hidden',
                    }}
                >
                    {labelComponents}
                    <Typography 
                        variant='body1' component="span"
                        className='slide-in-left-on-hover'
                        sx={{ 
                            transition: 'all 0.3s ease-in-out',
                            color: '#fff', py: 1, px: 2, width: 'fit-content', 
                        }}
                    >
                        View All
                    </Typography>
                </Typography>
            </Paper>
            {props.children}
        </Stack>
    );
}