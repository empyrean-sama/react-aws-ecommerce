import React from "react";
import Constants from "../../../../Constants";

import { Box, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import ListManager, { EListItemType } from "../../../ui/ListManager";

export default function PromotionManagement() {
    const listConfigurations = [
        {
            key: "promotion-banners",
            title: "Promotion Banners",
            description: "Manage the rotating banner images shown on the storefront.",
            memoryKey: Constants.PROMOTION_BANNER_LIST_KEY,
            maxItems: 5,
            fileSchema: [
                { name: "image", type: EListItemType.picture },
                { name: "alt-tag", type: EListItemType.string },
            ],
        },
    ];

    return (
        <Paper>
            <Container maxWidth="xl">
                <Stack spacing={2} sx={{ py: 3 }}>
                    <Box>
                        <Typography variant="h2">Promotion Management</Typography>
                        <Typography color="text.secondary">
                            Configure promotional content for the storefront by customizing various lists.
                        </Typography>
                    </Box>

                    <Stack spacing={3}>
                        {listConfigurations.map((listConfig) => (
                            <Paper key={listConfig.key} variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="h5">{listConfig.title}</Typography>
                                        <Typography color="text.secondary">{listConfig.description}</Typography>
                                    </Box>
                                    <ListManager
                                        memoryKey={listConfig.memoryKey}
                                        maxItems={listConfig.maxItems}
                                        fileSchema={listConfig.fileSchema}
                                    />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </Stack>
            </Container>
        </Paper>
    );
}