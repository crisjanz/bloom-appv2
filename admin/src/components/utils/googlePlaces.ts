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

export const calculateDeliveryFee = async (
  address: string, 
  city: string, 
  postalCode: string,
  province?: string,
  onFeeCalculated?: (fee: number) => void
): Promise<void> => {
  if (!address || !city) return;

  try {
    const service = new google.maps.DistanceMatrixService();
    const storeLocation = "Prince George, BC, Canada";
    const destinationAddress = `${address}, ${city}, ${province || "BC"}, ${postalCode}`;

    service.getDistanceMatrix(
      {
        origins: [storeLocation],
        destinations: [destinationAddress],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      },
      (response, status) => {
        if (status === 'OK' && response) {
          const distance = response.rows[0]?.elements[0]?.distance;
          if (distance) {
            const km = distance.value / 1000; // Convert meters to km
            
            // Calculate fee based on distance
            let fee = 0;
            if (km <= 5) {
              fee = 5;
            } else if (km <= 10) {
              fee = 10;
            } else if (km <= 20) {
              fee = 15;
            } else if (km <= 30) {
              fee = 20;
            } else {
              fee = 25; // Max fee or calculate per km
            }
            
            if (onFeeCalculated) {
              onFeeCalculated(fee);
            }
          }
        }
      }
    );
  } catch (error) {
    console.error("Error calculating delivery fee:", error);
  }
};