// src/config/maps.ts
const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const GOOGLE_MAPS_CONFIG = {
  apiKey: mapsApiKey,
  libraries: ["places", "geometry"] as ("places" | "geometry")[],
  defaultCenter: {
    lat: 53.9171, // Prince George, BC
    lng: -122.7497
  },
  defaultBounds: {
    north: 54.0000,
    south: 53.8000,
    east: -122.6000,
    west: -122.9000,
  }
};

// Store location for delivery calculations
export const STORE_LOCATION = {
  address: "Prince George, BC, Canada",
  postalCode: "V2L 3P8", // Update with your actual postal code
  coordinates: {
    lat: 53.9171,
    lng: -122.7497
  }
};

// Delivery fee structure
export const DELIVERY_FEES = [
  { maxDistance: 5, fee: 5 },
  { maxDistance: 10, fee: 10 },
  { maxDistance: 20, fee: 15 },
  { maxDistance: 30, fee: 20 },
  { maxDistance: Infinity, fee: 25 }
];
