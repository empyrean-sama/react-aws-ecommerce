import React, { useEffect, useState } from "react";
import { Box, IconButton, SxProps } from "@mui/material";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { Theme } from "@emotion/react";

export interface ImageCarouselProps {
    imageUrls: string[];
    imageWidth: string;
    aspectRatio: string;
    sx?: SxProps<Theme>
}

export default function ImageViewer(props: ImageCarouselProps) {
    const { imageUrls, aspectRatio, sx } = props;
    const [activeIndex, setActiveIndex] = useState(0);

    // Set the active index to 0 when imageUrls change
    useEffect(() => {
        setActiveIndex(0);
    }, [imageUrls]);

    if (imageUrls.length === 0) {
        return null;
    }

    function handleNext() {
        setActiveIndex((prev) => (prev + 1) % imageUrls.length);
    }

    function handleBack() {
        setActiveIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
    }

    return (
        <Box sx={{ ...sx }}>
            <Box
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 1,
                    bgcolor: "background.default",
                    width: "100%",
                }}
            >
                <Box
                    component="img"
                    src={imageUrls[activeIndex]}
                    alt="product image"
                    sx={{
                        display: "block",
                        objectFit: "contain",
                        width: "100%",
                        aspectRatio: aspectRatio,
                        backgroundColor: "background.paper",
                    }}
                />

                {/* Navigation arrows */}
                {imageUrls.length > 1 && (
                    <>
                        <IconButton
                            size="small"
                            onClick={handleBack}
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: 8,
                                transform: "translateY(-50%)",
                                bgcolor: "background.paper",
                                "&:hover": { bgcolor: "background.paper" },
                                boxShadow: 1,
                            }}
                        >
                            <KeyboardArrowLeft />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={handleNext}
                            sx={{
                                position: "absolute",
                                top: "50%",
                                right: 8,
                                transform: "translateY(-50%)",
                                bgcolor: "background.paper",
                                "&:hover": { bgcolor: "background.paper" },
                                boxShadow: 1,
                            }}
                        >
                            <KeyboardArrowRight />
                        </IconButton>
                    </>
                )}

                {/* Counter */}
                <Box
                    sx={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        px: 1,
                        py: 0.25,
                        borderRadius: 999,
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "common.white",
                        fontSize: "0.75rem",
                        minWidth: 40,
                        textAlign: "center",
                    }}
                >
                    {activeIndex + 1} / {imageUrls.length}
                </Box>
            </Box>
        </Box>
    );
}
