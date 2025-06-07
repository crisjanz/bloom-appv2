import React, { useRef } from "react";
import { Autocomplete } from '@react-google-maps/api';
import InputField from "./input/InputField";
import { parseGooglePlace, princeGeorgeBounds, ParsedAddress } from "../utils/googlePlaces";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter street address",
  label,
  id = "address1",
  className = "focus:border-[#597485] focus:ring-[#597485]/20",
  disabled = false,
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.address_components) {
        const parsedAddress = parseGooglePlace(place);
        
        // Call the parent callback with all address components
        onAddressSelect(parsedAddress);
        
        // Set only the street address (address1) in the input field, not the full formatted address
        onChange(parsedAddress.address1);
      }
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      
      <Autocomplete
        onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
        onPlaceChanged={handlePlaceSelect}
        bounds={princeGeorgeBounds}
        options={{ 
          strictBounds: false,
          componentRestrictions: { country: [] }
        }}
      >
        <InputField
          type="text"
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          disabled={disabled}
        />
      </Autocomplete>
    </div>
  );
}