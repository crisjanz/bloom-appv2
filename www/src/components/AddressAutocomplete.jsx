import { useRef } from "react";
import PropTypes from "prop-types";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { parseGooglePlace, princeGeorgeBounds } from "../utils/googlePlaces";

const libraries = ["places"];
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

// Plain input without Google Maps autocomplete
const PlainInput = ({ label, placeholder, value, onChange, disabled, variant = "desktop" }) => {
  if (variant === "mobile") {
    return (
      <div className="w-full">
        <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
          {label && (
            <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
              {label}
            </label>
          )}
          <input
            type="text"
            name="address1"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/40 dark:text-white dark:placeholder:text-dark-6/50"
          />
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="mb-6">
      {label && (
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          {label}
        </label>
      )}
      <input
        type="text"
        name="address1"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 font-medium text-body-color outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-dark-6"
      />
    </div>
  );
};

PlainInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(["mobile", "desktop"]),
};

// Inner component that uses the Google Maps hook
const GoogleAutocompleteInput = ({
  label,
  placeholder,
  value,
  onChange,
  onAddressSelect,
  disabled,
  variant = "desktop",
}) => {
  const autocompleteRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "checkout-google-maps",
    googleMapsApiKey,
    libraries,
    preventGoogleFontsLoading: true,
  });

  const handlePlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place) return;
    const parsed = parseGooglePlace(place);
    if (parsed.address1) {
      onChange({ target: { name: "address1", value: parsed.address1 } });
    }
    onAddressSelect(parsed);
  };

  if (!isLoaded) {
    return <PlainInput label={label} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} variant={variant} />;
  }

  if (variant === "mobile") {
    return (
      <div className="w-full">
        <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
          {label && (
            <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
              {label}
            </label>
          )}
          <Autocomplete
            onLoad={(instance) => {
              autocompleteRef.current = instance;
            }}
            onPlaceChanged={handlePlaceChanged}
            options={{
              bounds: princeGeorgeBounds,
              strictBounds: false,
              componentRestrictions: { country: ["ca"] },
              fields: ["address_components", "geometry"],
            }}
            className="flex-1"
          >
            <input
              type="text"
              name="address1"
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/40 dark:text-white dark:placeholder:text-dark-6/50"
            />
          </Autocomplete>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="mb-6">
      {label && (
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          {label}
        </label>
      )}
      <Autocomplete
        onLoad={(instance) => {
          autocompleteRef.current = instance;
        }}
        onPlaceChanged={handlePlaceChanged}
        options={{
          bounds: princeGeorgeBounds,
          strictBounds: false,
          componentRestrictions: { country: ["ca"] },
          fields: ["address_components", "geometry"],
        }}
        className="w-full"
      >
        <input
          type="text"
          name="address1"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 font-medium text-body-color outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-dark-6"
        />
      </Autocomplete>
    </div>
  );
};

GoogleAutocompleteInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onAddressSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// Wrapper that conditionally renders Google autocomplete or plain input
const AddressAutocomplete = ({
  label,
  placeholder = "Street address",
  value,
  onChange,
  onAddressSelect,
  disabled = false,
  variant = "desktop",
}) => {
  // No API key - render plain input (no hook called)
  if (!googleMapsApiKey) {
    return <PlainInput label={label} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} variant={variant} />;
  }

  return (
    <GoogleAutocompleteInput
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onAddressSelect={onAddressSelect}
      disabled={disabled}
      variant={variant}
    />
  );
};

AddressAutocomplete.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onAddressSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(["mobile", "desktop"]),
};

export default AddressAutocomplete;
