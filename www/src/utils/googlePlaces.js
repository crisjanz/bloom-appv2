export const parseGooglePlace = (place) => {
  if (!place) {
    return {
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    };
  }

  let address1 = "";
  let route = "";
  let address2 = "";
  let city = "";
  let province = "";
  let postalCode = "";
  let country = "";

  if (Array.isArray(place.address_components)) {
    place.address_components.forEach((component) => {
      if (!component.types) return;
      if (component.types.includes("street_number")) {
        address1 = component.long_name;
      }
      if (component.types.includes("route")) {
        route = component.long_name;
      }
      if (component.types.includes("sublocality") || component.types.includes("subpremise")) {
        address2 = component.long_name;
      }
      if (component.types.includes("locality")) {
        city = component.long_name;
      }
      if (component.types.includes("administrative_area_level_1")) {
        province = component.short_name;
      }
      if (component.types.includes("postal_code")) {
        postalCode = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.short_name;
      }
    });
  }

  const combinedAddress1 = [address1, route].filter(Boolean).join(" ").trim();

  return {
    address1: combinedAddress1,
    address2,
    city,
    province,
    postalCode,
    country,
  };
};

export const princeGeorgeBounds = {
  north: 54.0,
  south: 53.8,
  east: -122.6,
  west: -122.9,
};

export const PRINCE_GEORGE_CENTER = {
  lat: 53.9171,
  lng: -122.7497,
};

export default parseGooglePlace;
