import React from "react";
import SearchBar from "../../ui/SearchBar";
import ImageUploader from "./ImageUploader";
import ImageViewer from "../Admin/ImageViewer";

export default function Home() {
    return (
        <div>
            <SearchBar />
            <div style={{ marginTop: 16 }}>
                <ImageViewer 
                    imageUrls={[
                        "https://images.pexels.com/photos/35280980/pexels-photo-35280980.jpeg?_gl=1*1m0s82x*_ga*ODQ1MzAyNDA5LjE3NjY0ODQxNDM.*_ga_8JE65Q40S6*czE3NjY0ODQxNDMkbzEkZzEkdDE3NjY0ODQxNDUkajU4JGwwJGgw",
                        "https://images.pexels.com/photos/33944537/pexels-photo-33944537.jpeg?_gl=1*1vq2mbf*_ga*ODQ1MzAyNDA5LjE3NjY0ODQxNDM.*_ga_8JE65Q40S6*czE3NjY0ODQxNDMkbzEkZzEkdDE3NjY0ODQyMDYkajU5JGwwJGgw",
                        "https://images.pexels.com/photos/32784501/pexels-photo-32784501.jpeg?_gl=1*1s7h9zh*_ga*ODQ1MzAyNDA5LjE3NjY0ODQxNDM.*_ga_8JE65Q40S6*czE3NjY0ODQxNDMkbzEkZzEkdDE3NjY0ODQyMzEkajM0JGwwJGgw"
                    ]}
                    imageWidth="400px"
                    aspectRatio="3 / 2"
                />
            </div>
        </div>
    )
}