interface DeliveryZone {
  id: string;
  name: string;
  minDistance: number;
  maxDistance: number | null;
  fee: number;
  enabled: boolean;
}

interface DeliverySettings {
  storeAddress: string;
  storeLatitude?: number;
  storeLongitude?: number;
  deliveryMode: string;
  freeDeliveryMinimum?: number;
  maxDeliveryRadius?: number;
  enabled: boolean;
}

export async function calculateDeliveryFee(
  destinationAddress: string,
  destinationCity: string,
  destinationPostalCode: string,
  destinationProvince: string,
  onFeeCalculated?: (fee: number) => void
): Promise<number> {
  try {
    // Get delivery settings and zones
    const response = await fetch('/api/settings/delivery-charges');
    if (!response.ok) throw new Error('Failed to load delivery settings');
    
    const { settings, zones }: { settings: DeliverySettings; zones: DeliveryZone[] } = await response.json();
    
    if (!settings.enabled) {
      onFeeCalculated?.(0);
      return 0;
    }

    // Calculate distance using Google Maps Distance Matrix API
    const distance = await calculateDistance(
      settings.storeAddress,
      `${destinationAddress}, ${destinationCity}, ${destinationProvince} ${destinationPostalCode}`
    );

    if (distance === null) {
      console.warn('Could not calculate distance');
      onFeeCalculated?.(0);
      return 0;
    }

    // Check if beyond maximum delivery radius
    if (settings.maxDeliveryRadius && distance > settings.maxDeliveryRadius) {
      console.warn(`Address is beyond delivery radius: ${distance}km > ${settings.maxDeliveryRadius}km`);
      onFeeCalculated?.(0);
      return 0;
    }

    // Find appropriate zone
    const applicableZone = zones
      .filter(zone => zone.enabled)
      .find(zone => {
        const withinMin = distance >= zone.minDistance;
        const withinMax = zone.maxDistance === null || distance < zone.maxDistance;
        return withinMin && withinMax;
      });

    if (!applicableZone) {
      console.warn(`No delivery zone found for distance: ${distance}km`);
      onFeeCalculated?.(0);
      return 0;
    }

    const fee = applicableZone.fee;
    onFeeCalculated?.(fee);
    return fee;

  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    onFeeCalculated?.(0);
    return 0;
  }
}

async function calculateDistance(origin: string, destination: string): Promise<number | null> {
  try {
    const service = new google.maps.DistanceMatrixService();
    
    return new Promise((resolve) => {
      service.getDistanceMatrix({
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK && response) {
          const element = response.rows[0]?.elements[0];
          if (element?.status === 'OK' && element.distance) {
            // Convert meters to kilometers
            const distanceKm = element.distance.value / 1000;
            resolve(distanceKm);
          } else {
            resolve(null);
          }
        } else {
          console.error('Distance Matrix error:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
}