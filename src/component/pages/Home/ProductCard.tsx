import React from 'react';
import { appGlobalStateContext } from '../../App/AppGlobalStateProvider';

import { Typography, Box, Paper, Button, Chip,  } from '@mui/material';

import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import placeHolderImageString from 'url:./placeholderImage.png';

import IProductRecord from '../../../interface/product/IProductRecord';
import IProductVariantRecord from '../../../interface/product/IProductVariantRecord';
import IAppGlobalStateContextAPI from '../../../interface/IAppGlobalStateContextAPI';
import EProductFieldType from '../../../enum/EProductFieldType';
import ESnackbarMsgVariant from '../../../enum/ESnackbarMsgVariant';
import StarOutlined from '@mui/icons-material/StarOutlined';
import { getStockStatus } from './Helper';

interface IProductCardProps {
    productRecord: IProductRecord;
    productVariantRecord: IProductVariantRecord[];

    currency?: string; //defaults to INR
    rating?: number; // defaults to number.NaN, which means no rating shown
    reviewCount?: number; // defaults to number.NaN, which means no review count shown
}

export default function ProductCard(props: IProductCardProps) {

    // Global Api
    const { showMessage } = React.useContext(appGlobalStateContext) as IAppGlobalStateContextAPI;

    // Component State
    const [isHovered, setIsHovered] = React.useState<boolean>(false);

    // Computed properties
    const cardImage = props.productRecord.imageUrls[0] || placeHolderImageString;
    const cardImageAlt = `${props.productRecord.name} Image`;
    const currency = props.currency || 'INR';
    const defaultVariantRecord: IProductVariantRecord | null = props.productVariantRecord.find(variant => variant.variantId === props.productRecord.defaultVariantId) || props.productVariantRecord[0] || null;
    const stockCount: number = defaultVariantRecord ? defaultVariantRecord.stock : 0;
    const stockStatus = getStockStatus(stockCount);

    let ratingsComponent: React.ReactNode = null;

    if(props.rating) {
        ratingsComponent = (
            <Box sx={{ 
                backdropFilter: 'blur(5px)',
                backgroundColor: 'rgba(255, 255, 255, 0.5)', px: 1}}
                position='absolute' top={8} left={8} 
            >
                <StarOutlined sx={{ color: 'goldenrod', fontSize: 20, verticalAlign: 'middle' }} />
                <Typography variant='subtitle2' component='span' fontWeight='bold' sx={{ ml: 0.5, verticalAlign: 'middle' }}>
                    { props.rating.toFixed(1) }
                </Typography>
            </Box>
        );
    }

    const stockStatusComponent: React.ReactNode = (
        <Chip 
            label={stockStatus.statusText} color={stockStatus.statusColor} 
            sx={{
                position: 'absolute', top: 8, right: 8,
                padding: 0.5,
            }}
        />
    );

    // Private Methods
    function handleCardClick() {
        showMessage(`Clicked on product: ${props.productRecord.name}`, ESnackbarMsgVariant.info);
    }

    return(
        <Paper 
            sx={{
                transition: 'all 0.3s ease-in-out',
                display: 'flex', flexDirection: 'column', gap: 1, 
                position: "relative", cursor: 'pointer',
                "&:hover": {
                    boxShadow: 6,
                    transform: 'scale(1.01)',
                }, 
                "&:active": {
                    boxShadow: 2,
                    transform: 'scale(0.99)',
                },
                width: { xs: 200, md: 250 }
            }}
            onClick={handleCardClick}
        >
            {ratingsComponent}
            {stockStatusComponent}
            <Box component='img' src={cardImage} alt={cardImageAlt} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
            <Box>
                <Typography variant='subtitle1' fontWeight='bold' sx={{ mx: 2, textAlign: "center" }} noWrap>
                    {props.productRecord.name}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mx: 2, textAlign: "left" }} noWrap>
                    {currency} { defaultVariantRecord ? (defaultVariantRecord.price / 100).toFixed(2) : 'N/A' }
                </Typography>
            </Box>
            <Box sx={{ display: 'flex' }}>
                <Button 
                    color='primary' variant="contained" sx={{p: 1, flexBasis: '50%'}}
                    startIcon={<ShoppingCartOutlinedIcon />}
                >
                    Add
                </Button>
                <Button 
                    color='info' variant="contained" sx={{p: 1, flexBasis: '50%'}}
                >
                    Buy Now
                </Button>
            </Box>
        </Paper>
    );
}
