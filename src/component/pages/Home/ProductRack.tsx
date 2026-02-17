import React from 'react';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';

import { Box, Paper, Stack, Typography } from '@mui/material';
import ProductCard from "./ProductCard";

import placeHolderImageString from 'url:./placeholderImage.png';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';

const RACK_CARD_WIDTH = { xs: 175, md: 250 };
const LABEL_CHIP_SX = { backgroundColor: '#000', color: '#fff', py: 1, px: 2, my: 0.2, width: 'fit-content' };

export interface IProductRackProps {
    label: string;
    children: React.ReactElement<typeof ProductCard> | Array<React.ReactElement<typeof ProductCard>>;
}

function getRackHeroImage(children: IProductRackProps['children']): string {
    const childrenArray = React.Children.toArray(children) as Array<React.ReactElement<typeof ProductCard>>;
    return (childrenArray[0] as any)?.props?.productRecord?.imageUrls?.[0] || placeHolderImageString;
}

function renderRackLabel(label: string): React.ReactNode {
    return label.split(' ').map((word, index) => (
        <Box key={`${word}-${index}`} sx={LABEL_CHIP_SX}>
            {word}
        </Box>
    ));
}

export default function ProductRack(props: IProductRackProps) {

    // Global API
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Card State
    const [hovered, setHovered] = React.useState(false);

    // Computed Properties
    const heroImage = getRackHeroImage(props.children);
    const labelComponents = renderRackLabel(props.label);

    // Private Routines
    function handleRackClick() {
        showMessage(`Clicked on rack: ${props.label}`, ESnackbarMsgVariant.info);
    }

    return (
        <Stack direction="row" flexWrap={'wrap'} rowGap={2} columnGap={2} justifyContent={'center'}>
            <Paper
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    position: 'relative',
                    cursor: 'pointer',
                    width: RACK_CARD_WIDTH,
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleRackClick}
            >
                <Box
                    component="img"
                    src={heroImage}
                    alt="Product Rack Banner"
                    sx={{
                        transition: 'all 0.3s ease-in-out',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
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