import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, TruckIcon, ClockIcon } from '@shared/assets/icons';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

type MobileOrder = {
  id: string;
  orderNumber: string | number;
  type?: string | null;
  deliveryTime?: string | null;
  recipientCustomer?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  deliveryAddress?: {
    firstName?: string | null;
    lastName?: string | null;
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  recipientName?: string | null;
};

type DeliveryResponse = {
  success: boolean;
  orders?: {
    forDelivery?: MobileOrder[];
    forPickup?: MobileOrder[];
  };
  error?: string;
};

type RouteStop = {
  id: string;
  sequence: number;
  status: string;
  order: {
    id: string;
    orderNumber: number | string;
    recipientCustomer?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
    deliveryAddress?: {
      address1?: string | null;
      city?: string | null;
    } | null;
  };
};

type RouteSummary = {
  id: string;
  routeNumber: number;
  name?: string | null;
  date: string;
  status: string;
  driver?: { name?: string | null; phone?: string | null } | null;
  stops: RouteStop[];
};

const formatRecipientName = (order: MobileOrder) => {
  const fromRecipient = order.recipientCustomer
    ? `${order.recipientCustomer.firstName || ''} ${order.recipientCustomer.lastName || ''}`.trim()
    : '';
  if (fromRecipient) return fromRecipient;

  const fromAddress = order.deliveryAddress
    ? `${order.deliveryAddress.firstName || ''} ${order.deliveryAddress.lastName || ''}`.trim()
    : '';
  if (fromAddress) return fromAddress;

  if (order.recipientName) return order.recipientName;

  return 'Recipient';
};

const formatAddress = (order: MobileOrder) => {
  if (!order.deliveryAddress) return '';
  const parts = [
    order.deliveryAddress.address1,
    order.deliveryAddress.city,
    order.deliveryAddress.province,
    order.deliveryAddress.postalCode,
    order.deliveryAddress.country
  ].filter(Boolean);
  return parts.join(', ');
};

const buildMapLink = (address: string) => {
  if (!address) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
};

const formatStopRecipient = (stop: RouteStop) => {
  const recipient = stop.order.recipientCustomer
    ? `${stop.order.recipientCustomer.firstName || ''} ${stop.order.recipientCustomer.lastName || ''}`.trim()
    : '';
  if (recipient) return recipient;

  if (stop.order.deliveryAddress?.address1) {
    return stop.order.deliveryAddress.address1;
  }

  return `Order #${stop.order.orderNumber}`;
};

export default function MobileDeliveryPage() {
  const navigate = useNavigate();
  const { timezone, loading: timezoneLoading, getBusinessDateString, formatDate } = useBusinessTimezone();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [hasDateOverride, setHasDateOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<MobileOrder[]>([]);
  const [pickupOrders, setPickupOrders] = useState<MobileOrder[]>([]);
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [createRouteError, setCreateRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (!timezone || hasDateOverride) return;
    setSelectedDate(getBusinessDateString(new Date()));
  }, [timezone, getBusinessDateString, hasDateOverride]);

  useEffect(() => {
    if (!selectedDate) return;
    let isActive = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/orders/delivery?date=${selectedDate}`);
        const data = (await response.json()) as DeliveryResponse;
        if (!isActive) return;

        if (!response.ok || !data?.orders) {
          throw new Error(data?.error || 'Failed to load orders');
        }

        setDeliveryOrders(Array.isArray(data.orders.forDelivery) ? data.orders.forDelivery : []);
        setPickupOrders(Array.isArray(data.orders.forPickup) ? data.orders.forPickup : []);
      } catch (err) {
        console.error('Failed to load delivery orders:', err);
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    let isActive = true;

    const fetchRoutes = async () => {
      setRoutesLoading(true);
      setRoutesError(null);
      try {
        const response = await fetch(`/api/routes?date=${encodeURIComponent(selectedDate)}`);
        const data = await response.json();
        if (!isActive) return;

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load routes');
        }

        setRoutes(Array.isArray(data?.routes) ? data.routes : []);
      } catch (err) {
        console.error('Failed to load routes:', err);
        if (!isActive) return;
        setRoutesError(err instanceof Error ? err.message : 'Failed to load routes');
      } finally {
        if (isActive) {
          setRoutesLoading(false);
        }
      }
    };

    fetchRoutes();
    setSelectedOrderIds(new Set());
    setCreateRouteError(null);

    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  const assignedOrderIds = useMemo(() => {
    const ids = new Set<string>();
    routes.forEach((route) => {
      route.stops.forEach((stop) => {
        ids.add(stop.order.id);
      });
    });
    return ids;
  }, [routes]);

  const unassignedDeliveryOrders = useMemo(() => {
    return deliveryOrders.filter((order) => !assignedOrderIds.has(order.id));
  }, [deliveryOrders, assignedOrderIds]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleCreateRoute = async () => {
    if (!selectedDate || selectedOrderIds.size === 0) return;
    setCreatingRoute(true);
    setCreateRouteError(null);
    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          orderIds: Array.from(selectedOrderIds)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create route');
      }

      setRoutes((prev) => [...prev, data]);
      setSelectedOrderIds(new Set());
    } catch (err) {
      console.error('Failed to create route:', err);
      setCreateRouteError(err instanceof Error ? err.message : 'Failed to create route');
    } finally {
      setCreatingRoute(false);
    }
  };

  const renderOrderCard = (order: MobileOrder, typeLabel: string) => {
    const recipientName = formatRecipientName(order);
    const addressLine = formatAddress(order);
    const mapLink = addressLine ? buildMapLink(addressLine) : '';

    return (
      <div
        key={order.id}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">#{order.orderNumber}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {typeLabel}
            </span>
          </div>
          <div className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            {recipientName}
          </div>
          {addressLine && (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {addressLine}
            </div>
          )}
          {order.deliveryTime && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <span>{order.deliveryTime}</span>
            </div>
          )}
        </div>
        {mapLink ? (
          <a
            href={mapLink}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            Map
          </a>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <div className="bg-white dark:bg-gray-900 shadow-sm p-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/mobile')}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          aria-label="Back to mobile home"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Delivery Route</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedDate && formatDate(new Date(`${selectedDate}T00:00:00`))}
          </p>
        </div>
        <div className="ml-auto w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
          <TruckIcon className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setHasDateOverride(true);
              setSelectedDate(event.target.value);
            }}
            disabled={timezoneLoading}
            className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Routes
          </h2>
          {routesLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
              Loading routes...
            </div>
          ) : routesError ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-xl p-4">
              {routesError}
            </div>
          ) : routes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
              No routes planned yet.
            </div>
          ) : (
            routes.map((route) => (
              <div key={route.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Route #{route.routeNumber}</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                      {route.name || 'Delivery Route'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Driver: {route.driver?.name || 'Unassigned'}
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                    {route.stops.length} stops
                  </span>
                </div>
                <div className="space-y-2">
                  {route.stops.map((stop) => (
                    <div key={stop.id} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stop.sequence}.
                      </span>{' '}
                      #{stop.order.orderNumber} · {formatStopRecipient(stop)}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Build Route
          </h2>
          {createRouteError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-xl p-4">
              {createRouteError}
            </div>
          )}
          {loading || timezoneLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
              Loading orders...
            </div>
          ) : unassignedDeliveryOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
              All delivery orders are already assigned.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 space-y-3">
              {unassignedDeliveryOrders.map((order) => {
                const addressLine = formatAddress(order);
                return (
                  <label
                    key={order.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        #{order.orderNumber} · {formatRecipientName(order)}
                      </div>
                      {addressLine && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {addressLine}
                        </div>
                      )}
                      {order.deliveryTime && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>{order.deliveryTime}</span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
              <button
                onClick={handleCreateRoute}
                disabled={creatingRoute || selectedOrderIds.size === 0}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl active:scale-95 transition-transform disabled:cursor-not-allowed"
              >
                {creatingRoute ? 'Creating Route...' : 'Create Route'}
              </button>
            </div>
          )}
        </div>

        {timezoneLoading || loading ? (
          <div className="flex items-center justify-center text-gray-600 dark:text-gray-300">
            Loading orders...
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-xl p-4">
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Delivery
              </h2>
              {deliveryOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                  No delivery orders for today.
                </div>
              ) : (
                deliveryOrders.map((order) => renderOrderCard(order, 'Delivery'))
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Pickup
              </h2>
              {pickupOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                  No pickup orders for today.
                </div>
              ) : (
                pickupOrders.map((order) => renderOrderCard(order, 'Pickup'))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
