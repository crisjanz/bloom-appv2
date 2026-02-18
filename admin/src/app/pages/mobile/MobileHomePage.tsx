import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BoxCubeIcon,
  CameraIcon,
  ListIcon,
  PackageIcon,
  TruckIcon
} from '@shared/assets/icons';
import { useApiClient } from '@shared/hooks/useApiClient';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import MobilePageHeader from '@app/components/mobile/MobilePageHeader';

type MobileOrder = {
  id: string;
  status?: string | null;
};

type DeliveryResponse = {
  orders?: {
    forDelivery?: MobileOrder[];
    forPickup?: MobileOrder[];
  };
};

type DashboardStats = {
  orders: number;
  deliveries: number;
  pickups: number;
  fulfilled: number;
};

export default function MobileHomePage() {
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const { timezone, getBusinessDateString } = useBusinessTimezone();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<DashboardStats>({
    orders: 0,
    deliveries: 0,
    pickups: 0,
    fulfilled: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!timezone) return;
    setSelectedDate(getBusinessDateString(new Date()));
  }, [timezone, getBusinessDateString]);

  useEffect(() => {
    if (!selectedDate) return;
    let isActive = true;

    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const response = await apiClient.get(`/api/orders/delivery?date=${selectedDate}`);
        const data = response.data as DeliveryResponse;

        if (response.status >= 400 || !data?.orders) {
          throw new Error('Failed to load mobile dashboard stats');
        }

        const deliveryOrders = Array.isArray(data.orders.forDelivery) ? data.orders.forDelivery : [];
        const pickupOrders = Array.isArray(data.orders.forPickup) ? data.orders.forPickup : [];
        const allOrders = [...deliveryOrders, ...pickupOrders];
        const fulfilledCount = allOrders.filter((order) => (order.status || '').toUpperCase() === 'FULFILLED').length;

        if (!isActive) return;

        setStats({
          orders: allOrders.length,
          deliveries: deliveryOrders.length,
          pickups: pickupOrders.length,
          fulfilled: fulfilledCount
        });
      } catch (error) {
        console.error('Failed to load mobile home stats:', error);
        if (!isActive) return;
        setStats({
          orders: 0,
          deliveries: 0,
          pickups: 0,
          fulfilled: 0
        });
      } finally {
        if (isActive) {
          setLoadingStats(false);
        }
      }
    };

    loadStats();

    return () => {
      isActive = false;
    };
  }, [apiClient, selectedDate]);

  const dateLabel = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: timezone || undefined
    }).format(date);
  }, [selectedDate, timezone]);

  const metricCards = [
    {
      key: 'orders',
      label: 'Orders',
      value: stats.orders,
      className:
        'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    },
    {
      key: 'deliveries',
      label: 'Deliveries',
      value: stats.deliveries,
      className:
        'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    },
    {
      key: 'pickups',
      label: 'Pickups',
      value: stats.pickups,
      className:
        'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    },
    {
      key: 'fulfilled',
      label: 'Fulfilled',
      value: stats.fulfilled,
      className:
        'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    }
  ];

  const quickActions = [
    {
      key: 'scan',
      label: 'Scan Orders',
      icon: CameraIcon,
      onClick: () => navigate('/mobile/scan'),
      className:
        'bg-[#4A668B] hover:bg-[#415B7C] text-white'
    },
    {
      key: 'fulfillment',
      label: 'Fulfill Orders',
      icon: PackageIcon,
      onClick: () => navigate('/mobile/fulfillment'),
      className:
        'bg-[#A5524C] hover:bg-[#954842] text-white'
    },
    {
      key: 'inventory',
      label: 'Manage Inventory',
      icon: BoxCubeIcon,
      onClick: () => navigate('/mobile/inventory'),
      className:
        'bg-[#5C7F79] hover:bg-[#4F706B] text-white'
    },
    {
      key: 'supplies',
      label: 'Supplies',
      icon: ListIcon,
      onClick: () => navigate('/mobile/supplies'),
      className:
        'bg-[#7B6B8A] hover:bg-[#6D5E7B] text-white'
    },
    {
      key: 'delivery',
      label: 'Delivery Routes',
      icon: TruckIcon,
      onClick: () => navigate('/mobile/delivery'),
      className:
        'bg-[#4A403D] hover:bg-[#3F3633] text-white'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
        <MobilePageHeader title="Dashboard" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Today, {dateLabel}</p>

        <section className="grid grid-cols-2 gap-3">
          {metricCards.map((card) => (
            <div key={card.key} className={`rounded-3xl p-4 ${card.className}`}>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {loadingStats ? '--' : card.value}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{card.label}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className={`rounded-3xl p-4 text-left shadow-sm active:scale-[0.99] transition-transform ${action.className}`}
              >
                <action.icon className="h-5 w-5" />
                <p className="mt-3 text-sm font-semibold">{action.label}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
