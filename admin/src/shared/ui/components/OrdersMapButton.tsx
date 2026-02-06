import { useState, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPinIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import Button from '@shared/ui/components/ui/button/Button';

export type MapLocation = {
  address: string;
  label?: string;
  lat?: number;
  lng?: number;
};

type OrdersMapButtonProps = {
  /**
   * Array of locations to show on the map.
   * Each location should have an address string and optional label.
   */
  locations: MapLocation[];
  /**
   * Optional class name for styling
   */
  className?: string;
  /**
   * Button variant
   */
  variant?: 'primary' | 'outline';
  /**
   * Button size
   */
  size?: 'sm' | 'md';
  /**
   * Button text (defaults to "Map")
   */
  label?: string;
};

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

// Default center (Victoria, BC area)
const defaultCenter = {
  lat: 48.4284,
  lng: -123.3656,
};

/**
 * Button that opens a modal with Google Map showing delivery locations
 */
export const OrdersMapButton: React.FC<OrdersMapButtonProps> = ({
  locations,
  className,
  variant = 'outline',
  size = 'md',
  label = 'Map',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [geocodedLocations, setGeocodedLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapLocation | null>(null);

  const validLocations = useMemo(
    () => locations.filter((loc) => loc.address?.trim()),
    [locations]
  );

  const isDisabled = validLocations.length === 0;

  const geocodeAddresses = useCallback(async () => {
    if (validLocations.length === 0) return;

    setLoading(true);
    const geocoder = new google.maps.Geocoder();

    const results: MapLocation[] = [];

    for (const location of validLocations) {
      try {
        const response = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address: location.address }, (results, status) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });

        if (response[0]) {
          results.push({
            ...location,
            lat: response[0].geometry.location.lat(),
            lng: response[0].geometry.location.lng(),
          });
        }
      } catch (err) {
        console.warn(`Failed to geocode: ${location.address}`, err);
      }
    }

    setGeocodedLocations(results);
    setLoading(false);
  }, [validLocations]);

  const handleOpen = () => {
    setIsOpen(true);
    geocodeAddresses();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedMarker(null);
  };

  const mapCenter = useMemo(() => {
    if (geocodedLocations.length === 0) return defaultCenter;

    // Calculate center from all points
    const lats = geocodedLocations.filter((l) => l.lat).map((l) => l.lat!);
    const lngs = geocodedLocations.filter((l) => l.lng).map((l) => l.lng!);

    if (lats.length === 0) return defaultCenter;

    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };
  }, [geocodedLocations]);

  // Calculate bounds to fit all markers
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (geocodedLocations.length <= 1) return;

      const bounds = new google.maps.LatLngBounds();
      geocodedLocations.forEach((loc) => {
        if (loc.lat && loc.lng) {
          bounds.extend({ lat: loc.lat, lng: loc.lng });
        }
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    },
    [geocodedLocations]
  );

  const openInGoogleMaps = () => {
    if (validLocations.length === 1) {
      const encoded = encodeURIComponent(validLocations[0].address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
    } else {
      const addresses = validLocations.map((loc) => encodeURIComponent(loc.address));
      window.open(`https://www.google.com/maps/dir/${addresses.join('/')}`, '_blank');
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={className}
      >
        <MapPinIcon className="w-4 h-4 mr-1.5" />
        {label}
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-4xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Delivery Locations ({validLocations.length})
            </h2>
            <Button variant="outline" onClick={openInGoogleMaps} className="mr-10">
              Open in Google Maps
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand-500 mx-auto mb-2"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading map...</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={geocodedLocations.length === 1 ? 14 : 11}
                onLoad={onMapLoad}
                options={{
                  zoomControl: true,
                  zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_CENTER,
                  },
                  streetViewControl: false,
                  mapTypeControl: true,
                  mapTypeControlOptions: {
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                  },
                  fullscreenControl: true,
                  scaleControl: true,
                }}
              >
                {geocodedLocations.map((location, index) => (
                  <Marker
                    key={`${location.address}-${index}`}
                    position={{ lat: location.lat!, lng: location.lng! }}
                    label={{
                      text: String(index + 1),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                    onClick={() => setSelectedMarker(location)}
                  />
                ))}

                {selectedMarker && selectedMarker.lat && selectedMarker.lng && (
                  <InfoWindow
                    position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-1">
                      {selectedMarker.label && (
                        <div className="font-semibold text-gray-900">{selectedMarker.label}</div>
                      )}
                      <div className="text-sm text-gray-600">{selectedMarker.address}</div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
          )}

          {/* Location list */}
          <div className="mt-4 max-h-48 overflow-y-auto">
            <div className="grid gap-2">
              {validLocations.map((loc, index) => (
                <div
                  key={`${loc.address}-${index}`}
                  className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    {loc.label && (
                      <span className="font-medium text-gray-900 dark:text-white mr-2">
                        {loc.label}
                      </span>
                    )}
                    <span className="text-gray-600 dark:text-gray-400 truncate">{loc.address}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

/**
 * Helper to extract address string from order's delivery address
 */
export const formatOrderAddress = (deliveryAddress?: {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
} | null): string => {
  if (!deliveryAddress) return '';

  const parts = [
    deliveryAddress.address1,
    deliveryAddress.address2,
    deliveryAddress.city,
    deliveryAddress.province,
    deliveryAddress.postalCode,
  ].filter(Boolean);

  return parts.join(', ');
};

export default OrdersMapButton;
