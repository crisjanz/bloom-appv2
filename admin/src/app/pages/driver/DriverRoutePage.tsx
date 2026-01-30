import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import SignaturePad from 'react-signature-canvas';
import { useApiClient } from '@shared/hooks/useApiClient';
import { CheckCircleIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import TextArea from '@shared/ui/forms/input/TextArea';

type Address = {
  address1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

type Recipient = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type RouteStop = {
  id: string;
  sequence: number;
  status: string;
  order?: {
    orderNumber?: string;
    recipient?: Recipient;
    address?: Address;
  };
};

type RouteViewResponse = {
  type: 'route';
  order: {
    id: string;
    orderNumber: string;
    deliveryTime?: string;
    recipient: Recipient;
    address: Address;
  };
  route: {
    id: string;
    name?: string | null;
    status?: string;
    driver?: {
      name: string;
      phone?: string;
    } | null;
    stops: RouteStop[];
  };
};

type StandaloneViewResponse = {
  type: 'standalone';
  order: {
    id: string;
    orderNumber: string;
    deliveryTime?: string;
    deliveryDate?: string;
    recipient: Recipient;
    address: Address;
  };
};

type DriverRouteResponse = RouteViewResponse | StandaloneViewResponse;

type StopCoordinate = { lat: number; lng: number };

const mapContainerStyle = { width: '100%', height: '220px' };
const defaultCenter = { lat: 53.9171, lng: -122.7497 };

function formatGeocodeAddress(address?: Address) {
  if (!address) return '';

  const parts = [address.address1, address.city, address.province, address.postalCode].filter(Boolean);
  if (parts.length === 0) return '';

  const base = parts.join(', ');
  return base.toLowerCase().includes('canada') ? base : `${base}, Canada`;
}

export default function DriverRoutePage() {
  const apiClient = useApiClient();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [data, setData] = useState<DriverRouteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [driverNotes, setDriverNotes] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const sigPadRef = useRef<SignaturePad | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [stopCoordinates, setStopCoordinates] = useState<Record<string, StopCoordinate>>({});

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const loadRoute = useCallback(async () => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: responseData, status } = await apiClient.get(
        `/api/driver/route?token=${encodeURIComponent(token)}`
      );

      if (status >= 400) {
        throw new Error(responseData?.error || 'Failed to load route');
      }

      setData(responseData as DriverRouteResponse);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load route');
    } finally {
      setLoading(false);
    }
  }, [apiClient, token]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  const handleMarkDelivered = useCallback(
    async (stopId: string) => {
      const signatureDataUrl = sigPadRef.current?.toDataURL('image/png');
      try {
        const { data: responseData, status } = await apiClient.post(
          `/api/driver/route/stop/${stopId}/deliver`,
          {
            driverNotes: driverNotes || undefined,
            signatureDataUrl: signatureDataUrl || undefined,
            recipientName: recipientName || undefined
          }
        );

        if (status >= 400) {
          throw new Error(responseData?.error || 'Failed to mark delivered');
        }

        setSelectedStop(null);
        setDriverNotes('');
        setRecipientName('');
        sigPadRef.current?.clear();
        await loadRoute();
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : 'Failed to mark delivered');
      }
    },
    [apiClient, driverNotes, recipientName, loadRoute]
  );

  const stops = useMemo<RouteStop[]>(() => {
    if (data?.type === 'route') {
      return [...(data.route.stops || [])].sort((a, b) => a.sequence - b.sequence);
    }
    return [];
  }, [data]);

  const moveStop = useCallback(
    async (index: number, direction: number) => {
      if (!data || data.type !== 'route') return;

      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= stops.length) return;

      const newStops = [...stops];
      const [moved] = newStops.splice(index, 1);
      newStops.splice(newIndex, 0, moved);

      const updatedStops = newStops.map((stop, i) => ({ ...stop, sequence: i + 1 }));
      setData((prev) => {
        if (!prev || prev.type !== 'route') return prev;
        return {
          ...prev,
          route: { ...prev.route, stops: updatedStops }
        };
      });

      try {
        const { status, data: responseData } = await apiClient.put(
          `/api/driver/route/resequence?token=${encodeURIComponent(token)}`,
          {
            routeId: data.route.id,
            stopIds: updatedStops.map((stop) => stop.id)
          }
        );

        if (status >= 400) {
          throw new Error(responseData?.error || 'Failed to save stop order');
        }
      } catch (err) {
        console.error('Failed to save stop order:', err);
        loadRoute();
      }
    },
    [apiClient, data, stops, token, loadRoute]
  );

  const mapItems = useMemo(() => {
    if (!data) return [];

    if (data.type === 'route') {
      return stops.map((stop) => ({
        id: stop.id,
        label: stop.sequence?.toString?.() ?? '',
        address: stop.order?.address
      }));
    }

    if (data.type === 'standalone') {
      return [
        {
          id: data.order.id,
          label: '',
          address: data.order.address
        }
      ];
    }

    return [];
  }, [data, stops]);

  const markers = useMemo(() => {
    return mapItems
      .map((item) => {
        const address = item.address;
        if (!address) return null;

        const coords = stopCoordinates[item.id];
        if (coords) {
          return { id: item.id, label: item.label, position: coords };
        }

        if (typeof address.latitude === 'number' && typeof address.longitude === 'number') {
          return { id: item.id, label: item.label, position: { lat: address.latitude, lng: address.longitude } };
        }

        return null;
      })
      .filter(Boolean) as Array<{ id: string; label: string; position: StopCoordinate }>;
  }, [mapItems, stopCoordinates]);

  const currentCenter = useMemo(() => {
    if (markers.length > 0) {
      return markers[0].position;
    }
    return defaultCenter;
  }, [markers]);

  useEffect(() => {
    if (!mapsLoaded || mapItems.length === 0) return;

    const googleRef = window.google;
    if (!googleRef?.maps?.Geocoder) return;

    let cancelled = false;
    const geocoder = new googleRef.maps.Geocoder();

    const geocodeOne = (address: string) =>
      new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode(
          {
            address,
            region: 'ca',
            componentRestrictions: { country: 'CA' }
          },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
              return;
            }
            reject(new Error(`Geocode failed: ${status}`));
          }
        );
      });

    const run = async () => {
      const updates: Record<string, StopCoordinate> = {};

      for (const item of mapItems) {
        if (cancelled) return;
        if (stopCoordinates[item.id]) continue;

        const addressStr = formatGeocodeAddress(item.address);
        if (!addressStr) continue;

        try {
          const result = await geocodeOne(addressStr);
          const location = result.geometry?.location;
          if (location) {
            updates[item.id] = { lat: location.lat(), lng: location.lng() };
          }
        } catch (err) {
          console.warn('Failed to geocode map address', { itemId: item.id, addressStr, err });
        }

        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setStopCoordinates((prev) => ({ ...prev, ...updates }));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [mapsLoaded, mapItems, stopCoordinates]);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || markers.length === 0) return;

    const googleRef = window.google;
    if (!googleRef?.maps?.LatLngBounds) return;

    const bounds = new googleRef.maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend(marker.position));

    mapRef.current.fitBounds(bounds, 48);

    if (markers.length === 1) {
      mapRef.current.setZoom(14);
    }
  }, [mapsLoaded, markers]);

  const openGoogleMaps = (address?: Address) => {
    if (!address) return;
    const query = encodeURIComponent(
      `${address.address1 || ''}, ${address.city || ''}${address.province ? ', ' + address.province : ''}`
    );
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Loading route...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-red-600 font-semibold mb-2">Unable to load route</div>
          <div className="text-gray-700 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl">
        <div className="bg-white shadow-sm">
          <div className="p-4 border-b">
            <h1 className="text-lg font-semibold text-gray-900">
              {data.type === 'route' ? data.route.name || 'Driver Route' : `Order #${data.order.orderNumber}`}
            </h1>
            {data.type === 'route' && (
              <p className="text-sm text-gray-600">
                {data.route.driver ? `Driver: ${data.route.driver.name}` : 'Driver not assigned'}
              </p>
            )}
          </div>

          <div className="h-[240px] border-b">
            {mapsLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={currentCenter}
                zoom={12}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
                onUnmount={() => {
                  mapRef.current = null;
                }}
              >
                {markers.map((marker) => (
                  <Marker
                    key={marker.id}
                    position={marker.position}
                    label={marker.label ? marker.label.toString() : undefined}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading map...</div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {data.type === 'route' && stops.length > 0 && (
              <button
                onClick={() => {
                  const pendingStops = stops.filter((stop) => stop.status !== 'DELIVERED');
                  if (pendingStops.length === 0) return;
                  const destination = pendingStops[pendingStops.length - 1];
                  const waypoints = pendingStops.slice(0, -1);
                  const destAddr = destination.order?.address;
                  const destQuery = destAddr ? `${destAddr.address1}, ${destAddr.city}, ${destAddr.province}` : '';
                  const waypointQuery = waypoints
                    .map((stop) => {
                      const address = stop.order?.address;
                      return address ? `${address.address1}, ${address.city}, ${address.province}` : '';
                    })
                    .filter(Boolean)
                    .join('|');
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destQuery)}${
                    waypointQuery ? `&waypoints=${encodeURIComponent(waypointQuery)}` : ''
                  }`;
                  window.open(url, '_blank');
                }}
                className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Navigate Route in Google Maps
              </button>
            )}

            {data.type === 'route' ? (
              stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className={`rounded-lg border shadow-sm transition ${
                    stop.status === 'DELIVERED'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <button onClick={() => setSelectedStop(stop)} className="w-full p-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                            stop.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {stop.status === 'DELIVERED' ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : (
                            stop.sequence
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">Order #{stop.order?.orderNumber}</div>
                          <div className="text-xs text-gray-600">
                            {stop.order?.recipient?.firstName} {stop.order?.recipient?.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {stop.order?.address?.address1}, {stop.order?.address?.city}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs uppercase text-gray-500">{stop.status}</span>
                    </div>
                  </button>
                  {stop.status !== 'DELIVERED' && stops.length > 1 && (
                    <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                      <button
                        onClick={() => moveStop(index, -1)}
                        disabled={index === 0}
                        className="flex-1 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Move Up
                      </button>
                      <button
                        onClick={() => moveStop(index, 1)}
                        disabled={index === stops.length - 1}
                        className="flex-1 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Move Down
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                <div className="font-semibold text-gray-900">Order #{data.order.orderNumber}</div>
                <div className="text-sm text-gray-600">
                  {data.order.recipient.firstName} {data.order.recipient.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {data.order.address.address1}, {data.order.address.city}, {data.order.address.province}
                </div>
                <button
                  className="mt-3 text-sm text-indigo-600 underline"
                  onClick={() => openGoogleMaps(data.order.address)}
                >
                  Get Directions
                </button>
              </div>
            )}

            {data.type === 'route' && stops.length === 0 && (
              <div className="text-sm text-gray-500">No stops found for this route.</div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedStop)}
        onClose={() => setSelectedStop(null)}
        className="max-w-md mx-4"
      >
        {selectedStop && (
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-3">Order #{selectedStop.order?.orderNumber}</h2>
            <div className="text-sm text-gray-700 mb-3">
              {selectedStop.order?.recipient?.firstName} {selectedStop.order?.recipient?.lastName}
            </div>
            <div className="text-xs text-gray-500 mb-4">
              {selectedStop.order?.address?.address1}, {selectedStop.order?.address?.city}, {selectedStop.order?.address?.province}
            </div>

            {selectedStop.status !== 'DELIVERED' && (
              <>
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Signature</p>
                  <div className="overflow-hidden rounded border">
                    <SignaturePad
                      ref={sigPadRef}
                      canvasProps={{ width: 360, height: 180, className: 'bg-white' }}
                    />
                  </div>
                  <button
                    className="mt-2 text-xs text-gray-600 underline"
                    onClick={() => sigPadRef.current?.clear()}
                    type="button"
                  >
                    Clear
                  </button>
                </div>

                <div className="mb-3">
                  <InputField
                    id="recipientName"
                    label="Recipient Name (optional)"
                    value={recipientName || ''}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Recipient name"
                  />
                </div>

                <div className="mb-3">
                  <TextArea
                    id="driverNotes"
                    label="Notes (optional)"
                    value={driverNotes || ''}
                    onChange={(value) => setDriverNotes(value)}
                    rows={3}
                    placeholder="Add delivery notes"
                  />
                </div>

                <button
                  className="w-full rounded-lg bg-emerald-600 py-3 text-white font-semibold"
                  onClick={() => handleMarkDelivered(selectedStop.id)}
                >
                  Mark Delivered
                </button>
              </>
            )}

            <button
              className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 py-3 text-sm font-medium text-blue-700"
              onClick={() => openGoogleMaps(selectedStop.order?.address)}
            >
              Get Directions
            </button>
            <button
              className="mt-2 w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700"
              onClick={() => setSelectedStop(null)}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
