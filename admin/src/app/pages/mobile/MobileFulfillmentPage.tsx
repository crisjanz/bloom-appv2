import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, PackageIcon, ClockIcon } from '@shared/assets/icons';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';

type MobileOrder = {
  id: string;
  orderNumber: string | number;
  status?: string | null;
  type?: string | null;
  deliveryDate?: string | null;
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
    order.deliveryAddress.province
  ].filter(Boolean);
  return parts.join(', ');
};

export default function MobileFulfillmentPage() {
  const navigate = useNavigate();
  const orderNumberPrefix = useOrderNumberPrefix();
  const { timezone, loading: timezoneLoading, getBusinessDateString, formatDate } = useBusinessTimezone();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [hasDateOverride, setHasDateOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<MobileOrder[]>([]);
  const [pickupOrders, setPickupOrders] = useState<MobileOrder[]>([]);

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
        console.error('Failed to load fulfillment orders:', err);
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

  const renderOrderCard = (order: MobileOrder) => {
    const recipientName = formatRecipientName(order);
    const addressLine = formatAddress(order);
    const typeLabel = order.type === 'PICKUP' ? 'Pickup' : 'Delivery';

    return (
      <div
        key={order.id}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 flex items-center justify-between gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">#{formatOrderNumber(order.orderNumber, orderNumberPrefix)}</span>
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
        <button
          onClick={() => navigate(`/fulfillment/${order.id}`)}
          className="shrink-0 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
        >
          Fulfill
        </button>
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fulfillment</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedDate && formatDate(new Date(`${selectedDate}T00:00:00`))}
          </p>
        </div>
        <div className="ml-auto w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
          <PackageIcon className="w-5 h-5 text-white" />
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
                deliveryOrders.map(renderOrderCard)
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
                pickupOrders.map(renderOrderCard)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
