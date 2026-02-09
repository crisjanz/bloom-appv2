import { useRef } from "react";
import PropTypes from "prop-types";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { parseGooglePlace, princeGeorgeBounds } from "../utils/googlePlaces";

const libraries = ["places"];

const AddressAutocomplete = ({
  label,
  placeholder = "Street address",
  value,
  onChange,
  onAddressSelect,
  disabled = false,
  inputClassName = "",
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
  const autocompleteRef = useRef(null);

  // Hook must be called unconditionally (React rules of hooks)
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

  const renderInput = (inputProps = {}) => (
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
          className="flex-1 bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/50 dark:text-white dark:placeholder:text-dark-6/50"
          {...inputProps}
        />
      </div>
    </div>
  );

  // No API key or not loaded yet - render plain input
  if (!googleMapsApiKey || !isLoaded) {
    return renderInput();
  }

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
        >
          <input
            type="text"
            name="address1"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/50 dark:text-white dark:placeholder:text-dark-6/50"
          />
        </Autocomplete>
      </div>
    </div>
  );
};

AddressAutocomplete.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onAddressSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  inputClassName: PropTypes.string,
};

export default AddressAutocomplete;
