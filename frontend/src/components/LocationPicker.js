// src/components/LocationPicker.js
import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../utils/leafletIconFix";

// Default center: Kathmandu
const DEFAULT_CENTER = [27.7172, 85.324];

function LocationMarker({ position, setPosition }) {
  // Listens for map clicks and moves the marker to the clicked spot
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationPicker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);

  const handleSetPosition = (newPos) => {
    setPosition(newPos);
    onLocationSelect(newPos[0], newPos[1]); // lat, lng
  };

  return (
    <div>
      <p className="text-sm text-muted mb-2">
        We couldn't automatically find that location. Click on the map below to
        mark your room's exact position.
      </p>
      <div className="rounded-xl overflow-hidden border border-border h-64">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={handleSetPosition} />
        </MapContainer>
      </div>
      {position && (
        <p className="text-xs text-muted mt-1.5">
          Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
      )}
    </div>
  );
}
