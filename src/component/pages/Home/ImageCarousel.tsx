import React from 'react';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Box, Typography, IconButton, SxProps, Theme } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

export interface ICarouselItem {
    id: string;
    imageUrl: string;
    link?: string;
}

interface IImageCarouselProps {
    items: ICarouselItem[];
    sx?: SxProps<Theme>
}

function NextArrow(props: any) {
    const { className, style, onClick } = props;
    return (
        <Box
            sx={{
                ...style,
                display: "block",
                position: "absolute",
                top: "50%",
                right: "10px",
                transform: "translateY(-50%)",
                zIndex: 2,
                cursor: "pointer",
            }}
            onClick={onClick}
        >
            <IconButton size="large" sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.3)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' } }}>
                <ArrowForwardIosIcon fontSize="large" />
            </IconButton>
        </Box>
    );
}

function PrevArrow(props: any) {
    const { className, style, onClick } = props;
    return (
        <Box
            sx={{
                ...style,
                display: "block",
                position: "absolute",
                top: "50%",
                left: "10px",
                transform: "translateY(-50%)",
                zIndex: 2,
                cursor: "pointer",
            }}
            onClick={onClick}
        >
            <IconButton size="large" sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.3)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' } }}>
                <ArrowBackIosNewIcon fontSize="large" />
            </IconButton>
        </Box>
    );
}

export default function ImageCarousel({ items, sx }: IImageCarouselProps) {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        arrows: true,
        nextArrow: <NextArrow />,
        prevArrow: <PrevArrow />,
        appendDots: (dots: any) => (
            <Box
                sx={{
                    bottom: "16px",
                    "& li": {
                        margin: "0 2px",
                        width: "auto",
                        height: "auto",
                    },
                    "& li button": {
                        width: "16px",
                        height: "16px",
                        padding: 0,
                        "&:before": {
                            content: '""',
                            width: "16px",
                            height: "16px",
                            opacity: 0.5,
                            color: "transparent",
                            backgroundColor: "primary.main",
                            borderRadius: "0%",
                        },
                    },
                    "& li.slick-active button:before": {
                        opacity: 1,
                        backgroundColor: "info.main",
                    },
                }}
            >
                <ul style={{ margin: "0px" }}> {dots} </ul>
            </Box>
        ),
    };

    if (!items || items.length === 0) {
        return null; 
    }

    return (
        <Box sx={{
            width: '100%',
            ...sx
        }}>
            <Slider {...settings}>
                {items?.map((item) => (
                    <Box key={item.id} sx={{ outline: 'none' }}>
                        <Box component="img" src={item.imageUrl} alt={`Carousel item ${item.id}`} 
                            sx={{ 
                                width: '100%',
                                aspectRatio: '23/8',
                                objectFit: 'cover'
                            }}
                        />
                    </Box>
                ))}
            </Slider>
        </Box>
    );
}
