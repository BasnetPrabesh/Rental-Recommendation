// src/utils/leafletIconFix.js
import L from "leaflet";

// Fix for default marker icon not showing in React (known Leaflet quirk).
// Both LocationPicker.js and ListingMap.js import this instead of each
// redefining the same fix — running it twice was harmless, but this
// avoids keeping two copies in sync.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
