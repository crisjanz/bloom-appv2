// Google Places utility functions - Compatible with existing API

export interface ParsedAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
}

// Define bounds for Prince George, BC
export const princeGeorgeBounds = {
  north: 54.0000,
  south: 53.8000,
  east: -122.6000,
  west: -122.9000,
};

export const parseGooglePlace = (place: google.maps.places.PlaceResult): ParsedAddress => {
  let address1 = "";
  let address2 = "";
  let city = "";
  let province = "";
  let postalCode = "";
  let country = "";

  if (place.address_components) {
    place.address_components.forEach((component) => {
      const types = component.types;
      if (types.includes("street_number")) {
        address1 = component.long_name + " ";
      }
      if (types.includes("route")) {
        address1 += component.long_name;
      }
      if (types.includes("locality")) {
        city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        province = component.short_name; // This works for states/provinces globally
      }
      if (types.includes("postal_code")) {
        postalCode = component.long_name;
      }
      if (types.includes("country")) {
        country = component.short_name;
      }
    });
  }

  return {
    address1: address1.trim(),
    address2,
    city,
    province,
    postalCode,
    country,
  };
};
