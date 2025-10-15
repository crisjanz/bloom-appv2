
// TODO: Migrate to PlaceAutocompleteElement when @react-google-maps/api supports it
// Current timeline: 12+ months notice guaranteed by Google (as of March 2025)
// Tracking: https://developers.google.com/maps/documentation/javascript/places-migration-overview

import React from "react";
import { LoadScript } from '@react-google-maps/api';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey ?? ''} libraries={libraries}>
      {children}
    </LoadScript>
  );
}
