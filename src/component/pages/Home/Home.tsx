import React from "react";
import SearchBar from "../../ui/SearchBar";
import ImageUploader from "./ImageUploader";

export default function Home() {
    return (
        <div>
            <SearchBar />
            <div style={{ marginTop: 16 }}>
                <ImageUploader />
            </div>
        </div>
    )
}