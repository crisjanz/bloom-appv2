import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClockIcon } from '@shared/assets/icons';
import { useApiClient } from '@shared/hooks/useApiClient';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';
import MobilePageHeader from '@app/components/mobile/MobilePageHeader';
import DatePicker from '@shared/ui/forms/date-picker';
import { toast } from 'sonner';
import { patchFulfillmentStatus } from './mobileFulfillmentHelpers';

type MobileDateMode = 'TODAY' | 'TOMORROW' | 'CUSTOM';

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
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const { timezone, loading: timezoneLoading, getBusinessDateString } = useBusinessTimezone();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateMode, setDateMode] = useState<MobileDateMode>('TODAY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<MobileOrder[]>([]);
  const [pickupOrders, setPickupOrders] = useState<MobileOrder[]>([]);
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null);

  const toDateString = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!timezone) return;

    if (dateMode === 'TODAY') {
      setSelectedDate(getBusinessDateString(new Date()));
      return;
    }

    if (dateMode === 'TOMORROW') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(getBusinessDateString(tomorrow));
    }
  }, [timezone, getBusinessDateString, dateMode]);

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

  const openReferencePage = (orderId: string) => {
    navigate(`/mobile/fulfillment/${orderId}/reference`);
  };

  const updateOrderStatusInLists = useCallback((orderId: string, status: string) => {
    setDeliveryOrders((previous) =>
      previous.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
    setPickupOrders((previous) =>
      previous.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
  }, []);

  const handleStartOrder = async (event: React.MouseEvent<HTMLButtonElement>, order: MobileOrder) => {
    event.stopPropagation();

    try {
      setStartingOrderId(order.id);

      const currentStatus = (order.status || '').toUpperCase();
      if (currentStatus !== 'IN_DESIGN') {
        await patchFulfillmentStatus(apiClient, order.id, 'IN_DESIGN');
        updateOrderStatusInLists(order.id, 'IN_DESIGN');
        toast.success('Order moved to In Design');
      }

      openReferencePage(order.id);
    } catch (statusError) {
      console.error('Failed to start fulfillment order:', statusError);
      toast.error(statusError instanceof Error ? statusError.message : 'Failed to start order');
    } finally {
      setStartingOrderId(null);
    }
  };

  const renderOrderCard = (order: MobileOrder) => {
    const recipientName = formatRecipientName(order);
    const addressLine = formatAddress(order);
    const typeLabel = order.type === 'PICKUP' ? 'Pickup' : 'Delivery';

    return (
      <div
        key={order.id}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-5 flex items-center justify-between gap-4 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => openReferencePage(order.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openReferencePage(order.id);
          }
        }}
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
        <div className="shrink-0">
          <button
            type="button"
            onClick={(event) => handleStartOrder(event, order)}
            disabled={startingOrderId === order.id}
            className="min-w-[88px] rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 active:scale-95 transition-transform disabled:opacity-60"
          >
            {startingOrderId === order.id ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
        <MobilePageHeader title="Fulfillment" showBackButton />

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Date
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDateMode('TODAY')}
                className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
                  dateMode === 'TODAY'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateMode('TOMORROW')}
                className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
                  dateMode === 'TOMORROW'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDateMode('CUSTOM')}
                className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
                  dateMode === 'CUSTOM'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Date Picker
              </button>
            </div>

            {dateMode === 'CUSTOM' ? (
              <div className="mt-3">
                <DatePicker
                  id="mobile-fulfillment-date"
                  placeholder="Select date"
                  defaultDate={selectedDate || undefined}
                  onChange={(selectedDates) => {
                    if (selectedDates.length > 0) {
                      setSelectedDate(toDateString(selectedDates[0]));
                    }
                  }}
                />
              </div>
            ) : null}

            {timezoneLoading ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading business timezone...</p>
            ) : (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Selected date: {selectedDate}</p>
            )}
          </div>
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
