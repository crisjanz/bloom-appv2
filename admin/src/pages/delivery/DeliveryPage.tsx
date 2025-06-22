import React, { useState, useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { 
  CalenderIcon, 
  ClockIcon, 
  MapPinIcon, 
  PhoneIcon, 
  UserIcon2, 
  PackageIcon, 
  CheckCircleIcon, 
  TruckIcon 
} from '../../icons';
import ComponentCard from '../../components/common/ComponentCard';
import StatusBadge from '../../components/orders/StatusBadge';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Label from '../../components/form/Label';
import Button from '../../components/ui/button/Button';
import Select from '../../components/form/Select';
import { useBusinessTimezone } from '../../hooks/useBusinessTimezone';
import { useNavigate } from 'react-router';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: 'DELIVERY' | 'PICKUP';
  deliveryDate: string;
  deliveryTime?: string;
  paymentAmount: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  recipient?: {
    firstName: string;
    lastName: string;
    phone?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  orderItems: Array<{
    customName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface DeliveryData {
  forDelivery: Order[];
  forPickup: Order[];
  completed: Order[];
}

const DeliveryPage: React.FC = () => {
  const { timezone, loading: timezoneLoading, formatDate: formatBusinessDate, getBusinessDateString } = useBusinessTimezone();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [deliveryData, setDeliveryData] = useState<DeliveryData>({
    forDelivery: [],
    forPickup: [],
    completed: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatpickrRef = useRef<flatpickr.Instance | null>(null);
  
  // Set initial date when timezone is loaded
  useEffect(() => {
    if (timezone && !selectedDate) {
      const today = getBusinessDateString(new Date());
      setSelectedDate(today);
    }
  }, [timezone, selectedDate, getBusinessDateString]);

  // Fetch and filter orders for selected date
  const fetchDeliveryData = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/orders/list?limit=1000');
      const data = await response.json();
      
      if (response.ok && data.success) {
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Filter orders by selected date
        const filteredOrders = data.orders.filter((order: Order) => {
          const orderDateString = order.deliveryDate.split('T')[0]; // Get YYYY-MM-DD part
          return orderDateString === date;
        });
        
        // Categorize orders
        const forDelivery = filteredOrders.filter((order: Order) => 
          order.type === 'DELIVERY' && ['READY', 'OUT_FOR_DELIVERY'].includes(order.status)
        );
        
        const forPickup = filteredOrders.filter((order: Order) => 
          order.type === 'PICKUP' && order.status === 'READY'
        );
        
        const completed = filteredOrders.filter((order: Order) => 
          order.status === 'COMPLETED'
        );
        
        setDeliveryData({
          forDelivery,
          forPickup,
          completed
        });
      } else {
        setError(data.error || 'Failed to fetch orders');
        console.error('Failed to fetch orders:', data.error);
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize flatpickr when timezone is available
  useEffect(() => {
    if (!timezone || flatpickrRef.current || !selectedDate) return;
    
    const today = getBusinessDateString(new Date());
    
    const flatPickr = flatpickr('#date-selector', {
      mode: 'single',
      static: false,
      monthSelectorType: 'static',
      dateFormat: 'Y-m-d',
      defaultDate: selectedDate,
      minDate: today,
      clickOpens: true,
      allowInput: false,
      onChange: (selectedDates, dateStr) => {
        if (selectedDates.length > 0) {
          setSelectedDate(dateStr);
        }
      },
    });

    flatpickrRef.current = flatPickr;

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
        flatpickrRef.current = null;
      }
    };
  }, [timezone, selectedDate, getBusinessDateString]);

  // Load data when date changes and timezone is available
  useEffect(() => {
    if (selectedDate && timezone) {
      fetchDeliveryData(selectedDate);
    }
  }, [selectedDate, timezone]);

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

  // Status options for dropdowns
  const getStatusOptions = (orderType: string, currentStatus: string) => {
    const allOptions = [
      { value: 'PENDING', label: 'Pending' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'PROCESSING', label: 'Processing' },
      { value: 'READY', label: 'Ready' },
      { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ];
    
    // Filter out OUT_FOR_DELIVERY for pickup orders
    if (orderType === 'PICKUP') {
      return allOptions.filter(option => option.value !== 'OUT_FOR_DELIVERY');
    }
    
    return allOptions;
  };

  // Handle status updates
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Refresh data after status update
        fetchDeliveryData(selectedDate);
      } else {
        console.error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Handle row click to edit order
  const handleRowClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  // Order Table Row Component
  const OrderRow: React.FC<{ order: Order; section: 'delivery' | 'pickup' | 'completed' }> = ({ 
    order, 
    section 
  }) => (
    <tr 
      key={order.id} 
      onClick={() => handleRowClick(order.id)}
      className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
    >
      {/* Order Number */}
      <td className="px-4 py-3">
        <span className="font-semibold text-gray-900 dark:text-white">
          #{order.orderNumber}
        </span>
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900 dark:text-white font-medium">
          {order.customer.firstName} {order.customer.lastName}
        </div>
        {order.customer.phone && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {order.customer.phone}
          </div>
        )}
      </td>

      {/* Recipient/Address */}
      <td className="px-4 py-3">
        {order.type === 'DELIVERY' && order.recipient ? (
          <div>
            <div className="text-sm text-gray-900 dark:text-white font-medium">
              {order.recipient.firstName} {order.recipient.lastName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {order.recipient.address1}
              {order.recipient.address2 && <>, {order.recipient.address2}</>}
              <br />
              {order.recipient.city}, {order.recipient.province} {order.recipient.postalCode}
            </div>
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
          ${(order.paymentAmount / 100).toFixed(2)}
        </span>
      </td>

      {/* Status Dropdown */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Select
          options={getStatusOptions(order.type, order.status)}
          value={order.status}
          onChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
          className="text-xs min-w-[140px]"
        />
      </td>
    </tr>
  );

  return (
    <div className="p-4">
      {/* Breadcrumb */}
      <PageBreadcrumb pageName="Delivery Management" />

      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Delivery Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage deliveries and pickups for {formatDate(selectedDate)}
          </p>
        </div>

        {/* Date Selector */}
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
            onClick={() => fetchDeliveryData(selectedDate)}
            className="bg-[#597485] hover:bg-[#4e6575] text-white"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* For Delivery Section */}
          <ComponentCard 
            title={`For Delivery (${deliveryData.forDelivery.length})`}
            className="h-fit"
          >
            {deliveryData.forDelivery.length === 0 ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryData.forDelivery.map(order => (
                      <OrderRow key={order.id} order={order} section="delivery" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>

          {/* For Pickup Section */}
          <ComponentCard 
            title={`For Pickup (${deliveryData.forPickup.length})`}
            className="h-fit"
          >
            {deliveryData.forPickup.length === 0 ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryData.forPickup.map(order => (
                      <OrderRow key={order.id} order={order} section="pickup" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>

          {/* Completed Section */}
          <ComponentCard 
            title={`Completed (${deliveryData.completed.length})`}
            className="h-fit"
          >
            {deliveryData.completed.length === 0 ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryData.completed.map(order => (
                      <OrderRow key={order.id} order={order} section="completed" />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </div>
      )}
    </div>
  );
};

export default DeliveryPage;