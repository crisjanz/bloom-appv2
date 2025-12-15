import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import OrderCommunicationModal from '@app/components/delivery/OrderCommunicationModal';
import { 
  CalenderIcon, 
  ClockIcon, 
  MapPinIcon, 
  PhoneIcon, 
  UserIcon2, 
  PackageIcon, 
  CheckCircleIcon, 
  TruckIcon 
} from '@shared/assets/icons';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import Label from '@shared/ui/forms/Label';
import Button from '@shared/ui/components/ui/button/Button';
import StatusSelect from '@shared/ui/forms/StatusSelect';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { getStatusOptions, OrderType as FulfillmentOrderType } from '@shared/utils/orderStatusHelpers';
import { useNavigate } from 'react-router';
// MIGRATION: Use domain hook for delivery management
import { useDeliveryManagement } from '@domains/orders/hooks/useDeliveryManagement';
import { OrderStatus as DomainOrderStatus } from '@domains/orders/entities/Order';

// Temporary types until domain layer is fully implemented
type DeliveryPerson = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type DeliveryAddress = {
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

type DeliveryOrder = {
  id: string;
  orderNumber: string;
  status: string;
  type: FulfillmentOrderType | string;
  customer?: DeliveryPerson | null;
  recipientCustomer?: DeliveryPerson | null;
  deliveryAddress?: DeliveryAddress | null;
  deliveryDate: string;
  deliveryTime?: string;
  items: Array<{
    id?: string;
    name?: string;
    quantity?: number;
  }>;
  paymentAmount?: number;
  total?: number;
};

type DeliveryData = {
  deliveryDate: string;
  deliveryTime: string;
  notes?: string;
};

const normalizeOrderType = (type: DeliveryOrder['type']): FulfillmentOrderType =>
  type === 'PICKUP' ? 'PICKUP' : 'DELIVERY';

// MIGRATION: Order and DeliveryData interfaces now come from domain layer

const DeliveryPage: React.FC = () => {
  const { timezone, loading: timezoneLoading, formatDate: formatBusinessDate, getBusinessDateString } = useBusinessTimezone();
  const navigate = useNavigate();
  
  // MIGRATION: Use domain hook for delivery management (only for status updates)
  const { updateOrderStatus } = useDeliveryManagement();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'today' | 'tomorrow' | 'future'>('today');
  const flatpickrRef = useRef<flatpickr.Instance | null>(null);

  // All orders loaded upfront (today through +10 days)
  const [allOrders, setAllOrders] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtered display data based on active filter
  const [displayData, setDisplayData] = useState<any>(null);

  // Order counts for quick filters
  const [todayCount, setTodayCount] = useState<number>(0);
  const [tomorrowCount, setTomorrowCount] = useState<number>(0);
  const [futureCount, setFutureCount] = useState<number>(0);

  // Communication modal state
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false);
  const [selectedOrderForComm, setSelectedOrderForComm] = useState<any>(null);

  // Helper to filter orders by delivery date
  const filterOrdersByDate = (orders: any, targetDate: string) => {
    if (!orders) return null;

    // Convert ISO date to YYYY-MM-DD for comparison
    const extractDate = (isoString: string) => {
      if (!isoString) return '';
      return isoString.split('T')[0];
    };

    return {
      forDelivery: orders.forDelivery?.filter((o: any) => extractDate(o.deliveryDate) === targetDate) || [],
      forPickup: orders.forPickup?.filter((o: any) => extractDate(o.deliveryDate) === targetDate) || [],
      completed: orders.completed?.filter((o: any) => extractDate(o.deliveryDate) === targetDate) || [],
    };
  };

  // Helper to filter orders by date range (tomorrow through +N days)
  const filterOrdersByDateRange = (orders: any, startDate: string, daysCount: number) => {
    if (!orders || !timezone) return null;

    const start = new Date(startDate);
    const dates = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(getBusinessDateString(d));
    }

    // Convert ISO date to YYYY-MM-DD for comparison
    const extractDate = (isoString: string) => {
      if (!isoString) return '';
      return isoString.split('T')[0];
    };

    return {
      forDelivery: orders.forDelivery?.filter((o: any) => dates.includes(extractDate(o.deliveryDate))) || [],
      forPickup: orders.forPickup?.filter((o: any) => dates.includes(extractDate(o.deliveryDate))) || [],
      completed: orders.completed?.filter((o: any) => dates.includes(extractDate(o.deliveryDate))) || [],
    };
  };

  // Load all orders on mount (today through +10 days)
  useEffect(() => {
    if (!timezone) return;

    const loadAllOrders = async () => {
      setLoading(true);
      setError(null);

      const today = getBusinessDateString(new Date());
      const endDay = new Date();
      endDay.setDate(endDay.getDate() + 10);
      const endDayStr = getBusinessDateString(endDay);

      try {
        const response = await fetch(`/api/orders/delivery?startDate=${today}&endDate=${endDayStr}`);
        const data = await response.json();

        if (data.success) {
          setAllOrders(data.orders);
        } else {
          setError(data.error || 'Failed to load orders');
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadAllOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  // Calculate all counts when allOrders loads
  useEffect(() => {
    if (!allOrders || !timezone) return;

    const today = getBusinessDateString(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getBusinessDateString(tomorrow);

    // Helper to count orders inline
    const count = (orders: any) => {
      if (!orders) return 0;
      return (orders.forDelivery?.length || 0) +
             (orders.forPickup?.length || 0) +
             (orders.completed?.length || 0);
    };

    // Convert ISO date to YYYY-MM-DD for comparison
    const extractDate = (isoString: string) => {
      if (!isoString) return '';
      return isoString.split('T')[0];
    };

    // Filter for today
    const todayOrders = {
      forDelivery: allOrders.forDelivery?.filter((o: any) => extractDate(o.deliveryDate) === today) || [],
      forPickup: allOrders.forPickup?.filter((o: any) => extractDate(o.deliveryDate) === today) || [],
      completed: allOrders.completed?.filter((o: any) => extractDate(o.deliveryDate) === today) || [],
    };

    // Filter for tomorrow
    const tomorrowOrders = {
      forDelivery: allOrders.forDelivery?.filter((o: any) => extractDate(o.deliveryDate) === tomorrowStr) || [],
      forPickup: allOrders.forPickup?.filter((o: any) => extractDate(o.deliveryDate) === tomorrowStr) || [],
      completed: allOrders.completed?.filter((o: any) => extractDate(o.deliveryDate) === tomorrowStr) || [],
    };

    // Filter for future (tomorrow through +10 days)
    const futureDates = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(tomorrow);
      d.setDate(d.getDate() + i);
      futureDates.push(getBusinessDateString(d));
    }
    const futureOrders = {
      forDelivery: allOrders.forDelivery?.filter((o: any) => futureDates.includes(extractDate(o.deliveryDate))) || [],
      forPickup: allOrders.forPickup?.filter((o: any) => futureDates.includes(extractDate(o.deliveryDate))) || [],
      completed: allOrders.completed?.filter((o: any) => futureDates.includes(extractDate(o.deliveryDate))) || [],
    };

    setTodayCount(count(todayOrders));
    setTomorrowCount(count(tomorrowOrders));
    setFutureCount(count(futureOrders));

    // Set initial display data to today
    setDisplayData(todayOrders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrders, timezone]);

  // Set initial date when timezone is loaded
  useEffect(() => {
    if (timezone && !selectedDate) {
      const today = getBusinessDateString(new Date());
      setSelectedDate(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone, selectedDate]);

  // Initialize flatpickr when timezone is available
  useEffect(() => {
    if (!timezone || flatpickrRef.current || !selectedDate) return;

    const today = getBusinessDateString(new Date());

    const inputElement = document.querySelector<HTMLInputElement>('#date-selector');
    if (!inputElement) {
      return;
    }

    const flatPickr = flatpickr(inputElement, {
      mode: 'single',
      static: false,
      monthSelectorType: 'static',
      dateFormat: 'Y-m-d',
      defaultDate: selectedDate,
      minDate: today,
      clickOpens: true,
      allowInput: false,
      onChange: (selectedDates, dateStr) => {
        if (selectedDates.length > 0 && allOrders) {
          setSelectedDate(dateStr);

          // Convert ISO date to YYYY-MM-DD for comparison
          const extractDate = (isoString: string) => {
            if (!isoString) return '';
            return isoString.split('T')[0];
          };

          // Filter allOrders for the selected date
          const filtered = {
            forDelivery: allOrders.forDelivery?.filter((o: any) => extractDate(o.deliveryDate) === dateStr) || [],
            forPickup: allOrders.forPickup?.filter((o: any) => extractDate(o.deliveryDate) === dateStr) || [],
            completed: allOrders.completed?.filter((o: any) => extractDate(o.deliveryDate) === dateStr) || [],
          };
          setDisplayData(filtered);

          // Update active filter (custom date = 'future')
          const todayStr = getBusinessDateString(new Date());
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = getBusinessDateString(tomorrow);

          if (dateStr === todayStr) {
            setActiveFilter('today');
          } else if (dateStr === tomorrowStr) {
            setActiveFilter('tomorrow');
          } else {
            setActiveFilter('future');
          }
        }
      },
    });

    flatpickrRef.current = Array.isArray(flatPickr) ? flatPickr[0] : flatPickr;

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
        flatpickrRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone, selectedDate]);

  // Format date for display using business timezone
  const formatDate = (dateStr: string) => {
    if (!timezone || !dateStr) return dateStr || '';
    
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Validate date components
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return dateStr;
      }
      
      const date = new Date(year, month - 1, day);
      
      // Validate date object
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      const today = new Date();
      const todayInBusiness = getBusinessDateString(today);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowInBusiness = getBusinessDateString(tomorrow);

      if (dateStr === todayInBusiness) {
        return 'Today';
      } else if (dateStr === tomorrowInBusiness) {
        return 'Tomorrow';
      } else {
        return formatBusinessDate(date, { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error, dateStr);
      return dateStr;
    }
  };

  // Import the shared status options helper (removed local duplicate)

  // MIGRATION: Handle status updates using domain hook
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus as DomainOrderStatus);

      // Reload all orders after status update
      const today = getBusinessDateString(new Date());
      const endDay = new Date();
      endDay.setDate(endDay.getDate() + 10);
      const endDayStr = getBusinessDateString(endDay);

      const response = await fetch(`/api/orders/delivery?startDate=${today}&endDate=${endDayStr}`);
      const data = await response.json();

      if (data.success) {
        setAllOrders(data.orders);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Error is already handled in the domain hook
    }
  };

  // Handle row click to edit order
  const handleRowClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  // Handle communication modal
  const handleOpenCommunication = (order: DeliveryOrder, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to order edit
    setSelectedOrderForComm(order);
    setCommunicationModalOpen(true);
  };

  const handleCloseCommunication = () => {
    setCommunicationModalOpen(false);
    setSelectedOrderForComm(null);
  };

  const handleFulfill = (order: DeliveryOrder, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to order edit
    navigate(`/fulfillment/${order.id}`);
  };

  // Quick filter handlers - filter client-side from allOrders
  const handleTodayFilter = () => {
    if (!timezone || !allOrders) return;

    const today = getBusinessDateString(new Date());
    setSelectedDate(today);
    setActiveFilter('today');

    // Filter allOrders for today
    const filtered = filterOrdersByDate(allOrders, today);
    setDisplayData(filtered);
  };

  const handleTomorrowFilter = () => {
    if (!timezone || !allOrders) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getBusinessDateString(tomorrow);

    setSelectedDate(tomorrowStr);
    setActiveFilter('tomorrow');

    // Filter allOrders for tomorrow
    const filtered = filterOrdersByDate(allOrders, tomorrowStr);
    setDisplayData(filtered);
  };

  const handleFutureFilter = () => {
    if (!timezone || !allOrders) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getBusinessDateString(tomorrow);

    setSelectedDate(tomorrowStr);
    setActiveFilter('future');

    // Filter allOrders for future (tomorrow through +10 days)
    const filtered = filterOrdersByDateRange(allOrders, tomorrowStr, 10);
    setDisplayData(filtered);
  };

  // Order Table Row Component
  const OrderRow: React.FC<{ order: DeliveryOrder; section: 'delivery' | 'pickup' | 'completed' }> = ({ 
    order, 
    section 
  }) => {
    const normalizedType = normalizeOrderType(order.type);
    const amountCents =
      typeof order.paymentAmount === 'number'
        ? order.paymentAmount
        : typeof order.total === 'number'
        ? Math.round(order.total * 100)
        : 0;

    return (
      <tr 
      key={order.id} 
      onClick={() => handleRowClick(order.id)}
      className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
    >
      {/* Order Number */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            #{order.orderNumber}
          </span>
          {(order.status === 'CANCELLED' || order.status === 'REJECTED') && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {order.status === 'CANCELLED' ? 'CANCELLED' : 'REJECTED'}
            </span>
          )}
        </div>
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900 dark:text-white font-medium">
          {order.customer
            ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || 'Guest'
            : 'Guest'}
        </div>
        {order.customer?.phone && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {order.customer.phone}
          </div>
        )}
      </td>

      {/* Recipient/Address */}
      <td className="px-4 py-3">
        {normalizedType === 'DELIVERY' && (order.deliveryAddress || order.recipientCustomer) ? (
          <div>
            <div className="text-sm text-gray-900 dark:text-white font-medium">
              {order.deliveryAddress?.firstName || order.recipientCustomer?.firstName} {order.deliveryAddress?.lastName || order.recipientCustomer?.lastName}
            </div>
            {order.deliveryAddress && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {order.deliveryAddress.address1}
                {order.deliveryAddress.address2 && <>, {order.deliveryAddress.address2}</>}
                <br />
                {order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">In-store pickup</span>
        )}
      </td>

      {/* Delivery Time */}
      <td className="px-4 py-3">
        {order.deliveryTime ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {order.deliveryTime}
          </span>
        ) : (
          <span className="text-sm text-gray-400">No time specified</span>
        )}
      </td>

      {/* Amount */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          ${(amountCents / 100).toFixed(2)}
        </span>
      </td>

      {/* Status Select */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <StatusSelect
          options={getStatusOptions(normalizedType)}
          value={order.status}
          onChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
          orderType={normalizedType}
          placeholder="Change Status"
        />
      </td>

      {/* Action Buttons */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <button
            onClick={(e) => handleOpenCommunication(order, e)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#597485] text-white rounded hover:bg-[#4e6575] transition-colors text-sm"
          >
            <PhoneIcon className="w-4 h-4" />
            Contact
          </button>
          <button
            onClick={(e) => handleFulfill(order, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded transition-colors text-sm ${
              order.status === 'COMPLETED' || order.status === 'DELIVERED'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-[#597485] hover:bg-[#4e6575]'
            }`}
          >
            <PackageIcon className="w-4 h-4" />
            Fulfill
          </button>
        </div>
      </td>
      </tr>
    );
  };

  return (
    <div className="p-4">
      {/* Breadcrumb */}
      <PageBreadcrumb pageTitle="Delivery Management" />

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Delivery Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeFilter === 'future' ? (
                <>Manage deliveries and pickups for next 10 days</>
              ) : (
                <>Manage deliveries and pickups for {formatDate(selectedDate)}</>
              )}
            </p>
          </div>
        </div>

        {/* Date Selector and Quick Filter Buttons */}
        <div className="flex items-center gap-3">
          <Label htmlFor="date-selector" className="text-sm font-medium">
            Date:
          </Label>
          <div className="relative">
            <input
              id="date-selector"
              placeholder="Select date"
              value={selectedDate || ""}
              readOnly
              tabIndex={-1}
              className="h-11 w-48 rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-[#597485] focus:ring-[#597485]/20 dark:border-gray-700 dark:focus:border-[#597485] cursor-pointer"
            />
            <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
              <CalenderIcon className="size-5" />
            </span>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex gap-2 ml-2">
            <button
              onClick={handleTodayFilter}
              className={`h-11 px-4 rounded-lg border transition-all ${
                activeFilter === 'today'
                  ? 'bg-[#597485] text-white border-[#597485] shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#597485] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Today</span>
                <span className={`text-sm font-bold ${activeFilter === 'today' ? '' : 'text-[#597485]'}`}>
                  ({todayCount})
                </span>
              </div>
            </button>

            <button
              onClick={handleTomorrowFilter}
              className={`h-11 px-4 rounded-lg border transition-all ${
                activeFilter === 'tomorrow'
                  ? 'bg-[#597485] text-white border-[#597485] shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#597485] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Tomorrow</span>
                <span className={`text-sm font-bold ${activeFilter === 'tomorrow' ? '' : 'text-[#597485]'}`}>
                  ({tomorrowCount})
                </span>
              </div>
            </button>

            <button
              onClick={handleFutureFilter}
              className={`h-11 px-4 rounded-lg border transition-all ${
                activeFilter === 'future'
                  ? 'bg-[#597485] text-white border-[#597485] shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#597485] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Future (10d)</span>
                <span className={`text-sm font-bold ${activeFilter === 'future' ? '' : 'text-[#597485]'}`}>
                  ({futureCount})
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {timezoneLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#597485]"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading timezone settings...</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#597485]"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <PackageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">Error Loading Data</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="bg-[#597485] hover:bg-[#4e6575] text-white"
          >
            Try Again
          </Button>
        </div>
      ) : !displayData ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#597485]"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading delivery data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* For Delivery Section */}
          <ComponentCard
            title={`For Delivery (${displayData?.forDelivery?.length || 0})`}
            className="h-fit"
          >
            {(displayData?.forDelivery?.length === 0) ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TruckIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No deliveries scheduled</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Order</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Recipient</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Time</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.forDelivery.map(order => (
                      <OrderRow key={order.id} order={order} section="delivery" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>

          {/* For Pickup Section */}
          <ComponentCard
            title={`For Pickup (${displayData?.forPickup?.length || 0})`}
            className="h-fit"
          >
            {(displayData?.forPickup?.length || 0) === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <PackageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No pickups ready</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Order</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Recipient</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Time</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.forPickup.map(order => (
                      <OrderRow key={order.id} order={order} section="pickup" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>

          {/* Completed Section */}
          <ComponentCard
            title={`Completed (${displayData?.completed?.length || 0})`}
            className="h-fit"
          >
            {(displayData?.completed?.length || 0) === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No completed orders</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Order</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Recipient</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Time</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Amount</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.completed.map(order => (
                      <OrderRow key={order.id} order={order} section="completed" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </div>
      )}

      {/* Communication Modal */}
      <OrderCommunicationModal
        isOpen={communicationModalOpen}
        onClose={handleCloseCommunication}
        order={selectedOrderForComm}
      />
    </div>
  );
};

export default DeliveryPage;
