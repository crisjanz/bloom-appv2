import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import SignaturePad from 'react-signature-canvas';

const mapContainerStyle = { width: '100%', height: '220px' };
const defaultCenter = { lat: 49.2827, lng: -123.1207 };

function normalizeApiBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  const trimmed = baseUrl.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const DEFAULT_API_BASE = import.meta.env.DEV ? '/api' : 'https://api.hellobloom.ca/api';
const API_BASE = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || DEFAULT_API_BASE);

export default function DriverRoute() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [driverNotes, setDriverNotes] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const sigPadRef = useRef(null);

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
      const res = await fetch(`${API_BASE}/driver/route?token=${encodeURIComponent(token)}`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to load route');
      }
      setData(body);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to load route');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  const handleMarkDelivered = useCallback(
    async (stopId) => {
      const signatureDataUrl = sigPadRef.current?.toDataURL('image/png');
      try {
        const res = await fetch(`${API_BASE}/driver/route/stop/${stopId}/deliver`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverNotes: driverNotes || undefined,
            signatureDataUrl: signatureDataUrl || undefined,
            recipientName: recipientName || undefined
          })
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body?.error || 'Failed to mark delivered');
        }
        setSelectedStop(null);
        setDriverNotes('');
        setRecipientName('');
        sigPadRef.current?.clear();
        await loadRoute();
      } catch (err) {
        console.error(err);
        alert(err?.message || 'Failed to mark delivered');
      }
    },
    [driverNotes, recipientName, loadRoute]
  );

  const stops = useMemo(() => {
    if (data?.type === 'route') {
      return data.route.stops || [];
    }
    return [];
  }, [data]);

  const currentCenter = useMemo(() => {
    const firstWithCoords = stops.find((stop) => stop.order?.address?.latitude && stop.order?.address?.longitude);
    if (firstWithCoords) {
      return { lat: firstWithCoords.order.address.latitude, lng: firstWithCoords.order.address.longitude };
    }
    return defaultCenter;
  }, [stops]);

  const openGoogleMaps = (address) => {
    if (!address) return;
    const query = encodeURIComponent(
      `${address.address1 || ''}, ${address.city || ''}${address.province ? ', ' + address.province : ''}`
    );
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Loading route…</div>
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
              <GoogleMap mapContainerStyle={mapContainerStyle} center={currentCenter} zoom={12}>
                {stops.map((stop) =>
                  stop.order?.address?.latitude && stop.order?.address?.longitude ? (
                    <Marker
                      key={stop.id}
                      position={{ lat: stop.order.address.latitude, lng: stop.order.address.longitude }}
                      label={stop.sequence.toString()}
                    />
                  ) : null
                )}
              </GoogleMap>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading map…</div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {data.type === 'route' ? (
              stops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => setSelectedStop(stop)}
                  className={`w-full rounded-lg border p-3 text-left shadow-sm transition ${
                    stop.status === 'DELIVERED'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          stop.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {stop.status === 'DELIVERED' ? '✓' : stop.sequence}
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

      {selectedStop && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-3">Order #{selectedStop.order?.orderNumber}</h2>
            <div className="text-sm text-gray-700 mb-3">
              {selectedStop.order?.recipient?.firstName} {selectedStop.order?.recipient?.lastName}
            </div>
            <div className="text-xs text-gray-500 mb-4">
              {selectedStop.order?.address?.address1}, {selectedStop.order?.address?.city},{' '}
              {selectedStop.order?.address?.province}
            </div>

            {selectedStop.status !== 'DELIVERED' && (
              <>
                <div className="mb-3">
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
                  <label className="text-sm font-medium text-gray-700">Recipient Name (optional)</label>
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Recipient name"
                  />
                </div>

                <div className="mb-3">
                  <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                  <textarea
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
              className="mt-3 w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700"
              onClick={() => setSelectedStop(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
