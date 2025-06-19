// pages/orders/OrdersListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import Badge from '../../components/ui/badge/Badge';
import ComponentCard from '../../components/common/ComponentCard';
import { statusOptions as importedStatusOptions } from '../../components/orders/types';
import StatusBadge from '../../components/orders/StatusBadge';
import Label from '../../components/form/Label';
import Select from '../../components/form/Select';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

import type { OrderStatus, OrderType } from '../../utils/orderStatusHelpers';

interface Order {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  type: OrderType;
  createdAt: string;
  deliveryDate: string | null;
  paymentAmount: number;
  customer: {
    firstName: string;
    lastName: string;
  };
  recipient?: {
    firstName: string;
    lastName: string;
  };
  orderItems: Array<{
    customName: string;
    quantity: number;
  }>;
}

// Add "All Status" option to the imported status options
const statusOptions = [
  { value: "ALL", label: "All Status" },
  ...importedStatusOptions
];

const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Only set main loading to true on initial load or status filter change
    if (orders.length === 0) {
      setLoading(true);
    } else {
      setSearching(true);
    }
    fetchOrders();
  }, [statusFilter, searchTerm]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/orders/list?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        console.error('Failed to fetch orders:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleView = (id: string) => {
    navigate(`/orders/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/orders/${id}/edit`);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Only show loading spinner on initial load
  if (loading && orders.length === 0) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#597485]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageBreadcrumb />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and track all your orders
          </p>
        </div>
        <Link
          to="/orders/new"
          className="inline-flex items-center px-4 py-2 bg-[#597485] text-white text-sm font-medium rounded-lg hover:bg-[#4e6575] transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Single Component Card with Filters and Table */}
      <ComponentCard title="Orders Management">
        <div className="space-y-6">
          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <Label>Search Orders</Label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by order number, customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
                {/* Small loading indicator in the input */}
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[#597485]"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Filter by Status</Label>
              <Select
                options={statusOptions}
                placeholder="Select Status"
                onChange={handleStatusFilterChange}
                value={statusFilter}
                className="dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Order
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Customer
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Recipient
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Delivery Date
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Total
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {orders.map((order) => (
                    <TableRow key={order.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            #{order.orderNumber}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {order.customer.firstName} {order.customer.lastName}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {order.recipient 
                          ? `${order.recipient.firstName} ${order.recipient.lastName}`
                          : order.type === 'PICKUP' ? 'Pickup' : '—'
                        }
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <StatusBadge 
                          status={order.status}
                          orderType={order.type}
                        />
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-white">
                          {formatCurrency(order.paymentAmount)}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleView(order.id)}
                            className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
                          >
                            View
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            onClick={() => handleEdit(order.id)}
                            className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {orders.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  {searchTerm || statusFilter !== 'ALL' 
                    ? 'No orders match your search criteria' 
                    : 'No orders found'
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </ComponentCard>
    </div>
  );
};

export default OrdersListPage;