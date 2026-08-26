// src/components/ListingMap.js
import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../utils/leafletIconFix";

function MapBody({ latitude, longitude, title, locked, interactive }) {
  const position = [latitude, longitude];

  return (
    <MapContainer
      center={position}
      zoom={locked ? 13 : 15}
      scrollWheelZoom={interactive && !locked}
      dragging={interactive && !locked}
      doubleClickZoom={interactive && !locked}
      zoomControl={interactive && !locked}
      touchZoom={interactive && !locked}
      className={`w-full h-full ${locked ? "blur-md scale-110" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!locked && (
        <Marker position={position}>
          <Popup>{title}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

export default function ListingMap({ latitude, longitude, title, locked }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Normal inline map — taller than before, still fits inside the modal */}
      <div className="relative rounded-xl overflow-hidden border border-border h-64 sm:h-80">
        <MapBody
          latitude={latitude}
          longitude={longitude}
          title={title}
          locked={locked}
          interactive={!locked}
        />

        {!locked && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-border
                       flex items-center justify-center text-primary shadow-sm hover:scale-110 transition z-[400]"
            title="Expand map"
          >
            ⛶
          </button>
        )}

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white text-center px-4 pointer-events-none">
            <span className="text-lg">🔒</span>
            <p className="text-xs font-semibold mt-1">
              Exact location revealed after your visit is confirmed
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen overlay when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-card rounded-2xl overflow-hidden w-full max-w-4xl h-[80vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-border
                         flex items-center justify-center text-primary shadow-sm hover:scale-110 transition z-[1100]"
            >
              ✕
            </button>
            <MapBody
              latitude={latitude}
              longitude={longitude}
              title={title}
              locked={locked}
              interactive={true}
            />
          </div>
        </div>
      )}
    </>
  );
}
