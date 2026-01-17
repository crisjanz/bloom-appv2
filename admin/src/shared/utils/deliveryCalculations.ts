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

export interface DeliveryZoneResult {
  fee: number;
  inZone: boolean;
  distance: number | null;
  zoneName?: string;
}

export async function calculateDeliveryFee(
  destinationAddress: string,
  destinationCity: string,
  destinationPostalCode: string,
  destinationProvince: string,
  onFeeCalculated?: (fee: number) => void,
  onZoneResult?: (result: DeliveryZoneResult) => void
): Promise<number> {
  try {
    // Get delivery settings and zones
    const response = await fetch('/api/settings/delivery-charges');
    if (!response.ok) throw new Error('Failed to load delivery settings');

    const { settings, zones }: { settings: DeliverySettings; zones: DeliveryZone[] } = await response.json();

    if (!settings.enabled) {
      onFeeCalculated?.(0);
      onZoneResult?.({ fee: 0, inZone: true, distance: null });
      return 0;
    }

    // Format destination address properly
    const destinationFormatted = `${destinationAddress}, ${destinationCity}, ${destinationProvince} ${destinationPostalCode}`;
    console.log('🗺️ Calculating distance:');
    console.log('  Origin:', settings.storeAddress);
    console.log('  Destination:', destinationFormatted);

    // Calculate distance using Google Maps Distance Matrix API
    const distance = await calculateDistance(
      settings.storeAddress,
      destinationFormatted
    );

    if (distance === null) {
      console.warn('Could not calculate distance');
      onFeeCalculated?.(0);
      onZoneResult?.({ fee: 0, inZone: false, distance: null });
      return 0;
    }

    // Check if beyond maximum delivery radius
    if (settings.maxDeliveryRadius && distance > settings.maxDeliveryRadius) {
      console.warn(`Address is beyond delivery radius: ${distance}km > ${settings.maxDeliveryRadius}km`);
      onFeeCalculated?.(0);
      onZoneResult?.({ fee: 0, inZone: false, distance });
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
      onZoneResult?.({ fee: 0, inZone: false, distance });
      return 0;
    }

    const feeInCents = Math.round(applicableZone.fee);
    onFeeCalculated?.(feeInCents);
    onZoneResult?.({
      fee: feeInCents,
      inZone: true,
      distance,
      zoneName: applicableZone.name
    });
    return feeInCents;

  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    onFeeCalculated?.(0);
    onZoneResult?.({ fee: 0, inZone: false, distance: null });
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
        console.log('📍 Distance Matrix API Response:');
        console.log('  Status:', status);
        console.log('  Response:', response);
        
        if (status === google.maps.DistanceMatrixStatus.OK && response) {
          const element = response.rows[0]?.elements[0];
          console.log('  Element:', element);
          
          if (element?.status === 'OK' && element.distance) {
            console.log('  Distance (meters):', element.distance.value);
            console.log('  Distance (text):', element.distance.text);
            console.log('  Duration:', element.duration?.text);
            
            // Convert meters to kilometers
            const distanceKm = element.distance.value / 1000;
            console.log('  Distance (km):', distanceKm);
            resolve(distanceKm);
          } else {
            console.error('Element error:', element?.status);
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
