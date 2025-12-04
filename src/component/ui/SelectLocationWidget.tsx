import React from "react";
import { MapContainer, useMapEvents, TileLayer, Marker } from 'react-leaflet';
import { LatLng, DivIcon } from "leaflet";

import "leaflet/dist/leaflet.css";

export interface SelectLocationProps {
    location: LatLng;
    setLocationChange: React.Dispatch<React.SetStateAction<LatLng>>;
}
export default function SelectLocation(props: SelectLocationProps) {

    // The custom marker icon using an SVG path
    const markerDivIcon = new DivIcon({
        html: `<div style="fill: #d32f2f; stroke: white; stroke-width: 2px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 252.6C128 148.4 214 64 320 64C426 64 512 148.4 512 252.6C512 371.9 391.8 514.9 341.6 569.4C329.8 582.2 310.1 582.2 298.3 569.4C248.1 514.9 127.9 371.9 127.9 252.6zM320 320C355.3 320 384 291.3 384 256C384 220.7 355.3 192 320 192C284.7 192 256 220.7 256 256C256 291.3 284.7 320 320 320z"/></svg>
        </div>`,
        iconSize: [36, 36],
    });

    const markerRef = React.useRef<L.Marker | null>(null);

    return (
        <MapContainer 
            center={props.location} 
            zoom={18}
            minZoom={13}
            style={{ width: '100%', aspectRatio: '16/9' }} 
            attributionControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <PanZoomHandler markerRef={markerRef} onCenterChange={(coords) => props.setLocationChange(new LatLng(coords[0], coords[1]))} />

            <Marker ref={markerRef} position={props.location} icon={markerDivIcon} />
        </MapContainer>
    );
}

interface PanZoomHandlerProps {
    markerRef: React.RefObject<L.Marker | null>;
    onCenterChange: (coordinates: [number, number]) => void;
}

function PanZoomHandler({markerRef, onCenterChange}: PanZoomHandlerProps) {
  
    useMapEvents({
        move(map) {
            const c = map.target.getCenter();
            markerRef.current?.setLatLng(c);
        },
        zoom(map) {
            const c = map.target.getCenter();
            markerRef.current?.setLatLng(c);
        },
        
        moveend(map) {
            const c = map.target.getCenter();
            onCenterChange([c.lat, c.lng]); 
        },
        zoomend(map) {
            const c = map.target.getCenter();
            onCenterChange([c.lat, c.lng]); 
        },
    });

  return null;
}