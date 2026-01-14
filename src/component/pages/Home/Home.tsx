import React from "react";
import { Container, Typography, Grid } from "@mui/material";
import ProductCard from "./ProductCard";
import IProductRecord from "../../../interface/product/IProductRecord";
import IProductVariantRecord from "../../../interface/product/IProductVariantRecord";

const MOCK_PRODUCTS: IProductRecord[] = [
    {
        productId: "p1",
        name: "Wireless Noise Cancelling Headphones",
        description: "Premium sound with active noise cancellation.",
        collectionId: "c1",
        featured: "true",
        featuredStrength: 10,
        favourite: "false",
        favouriteStrength: 0,
        tags: ["electronics", "audio"],
        fields: [],
        imageUrls: ["https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=500&q=80"],
        defaultVariantId: "v1"
    },
    {
        productId: "p2",
        name: "Minimalist Watch",
        description: "Elegant timepiece for everyday wear.",
        collectionId: "c2",
        featured: "false",
        featuredStrength: 0,
        favourite: "true",
        favouriteStrength: 5,
        tags: ["accessories", "fashion"],
        fields: [],
        imageUrls: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500&q=80"],
        defaultVariantId: "v2"
    },
    {
        productId: "p3",
        name: "Ergonomic Office Chair",
        description: "Comfortable chair for long working hours.",
        collectionId: "c3",
        featured: "true",
        featuredStrength: 5,
        favourite: "true",
        favouriteStrength: 8,
        tags: ["furniture", "office"],
        fields: [],
        imageUrls: ["https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=500&q=80"],
        defaultVariantId: "v3"
    },
    {
        productId: "p4",
        name: "Ceramic Coffee Mug",
        description: "Handcrafted ceramic mug.",
        collectionId: "c4",
        featured: "false",
        featuredStrength: 0,
        favourite: "false",
        favouriteStrength: 0,
        tags: ["kitchen", "home"],
        fields: [],
        imageUrls: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&q=80"],
        defaultVariantId: "v4"
    }
];

const MOCK_VARIANTS: Record<string, IProductVariantRecord[]> = {
    "p1": [
        {
            variantId: "v1",
            productId: "p1",
            collectionId: "c1",
            name: "Black",
            price: 2499900, // 24,999.00 INR (in paisa)
            stock: 15,
            relatedProductIds: [],
            maximumInOrder: 5
        }
    ],
    "p2": [
        {
            variantId: "v2",
            productId: "p2",
            collectionId: "c2",
            name: "Silver",
            price: 599900, // 5,999.00 INR
            stock: 0, // Out of stock
            relatedProductIds: [],
            maximumInOrder: 2
        }
    ],
    "p3": [
        {
            variantId: "v3",
            productId: "p3",
            collectionId: "c3",
            name: "Grey",
            price: 1599900, // 15,999.00 INR
            stock: 5,
            relatedProductIds: [],
            maximumInOrder: 1
        }
    ],
    "p4": [
        {
            variantId: "v4",
            productId: "p4",
            collectionId: "c4",
            name: "Blue",
            price: 49900, // 499.00 INR
            stock: 100,
            relatedProductIds: [],
            maximumInOrder: 10
        }
    ]
};

export default function Home() {
    return (
        <Container maxWidth="xl" sx={{ paddingX: { xs: 2, sm: 3 }, marginY: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginTop: 16, width: '100%' }}>
                <Typography variant="h4" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>Featured Products</Typography>
                <ProductCard 
                    productRecord={MOCK_PRODUCTS[0]} 
                    productVariantRecord={MOCK_VARIANTS[MOCK_PRODUCTS[0].productId]} 
                    currency="INR" 
                    rating={4.5} 
                    reviewCount={120}
                />
            </div>
        </Container>
    )
}