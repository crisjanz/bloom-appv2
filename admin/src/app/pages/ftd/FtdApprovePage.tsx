import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FtdOrder {
  id: string;
  externalId: string;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  deliveryDate: string | null;
  totalAmount: number | null;
  linkedOrder: {
    id: string;
    orderNumber: number;
    deliveryDate: string | null;
    orderItems: Array<{
      id: string;
      customName: string | null;
      unitPrice: number;
      quantity: number;
      rowTotal: number;
    }>;
  };
}

export default function FtdApprovePage() {
  const [orders, setOrders] = useState<FtdOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ftd/orders/needs-approval');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch approval orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEditOrder = (orderId: string) => {
    navigate(`/orders/${orderId}/edit`);
  };

  const handleApprove = async (ftdOrderId: string) => {
    try {
      const res = await fetch(`/api/ftd/orders/${ftdOrderId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        // Remove from list
        setOrders(orders.filter(o => o.id !== ftdOrderId));
      }
    } catch (error) {
      console.error('Failed to approve order:', error);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          FTD Orders - Approval Queue
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Review and adjust auto-created Bloom orders before production
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-orange-900 dark:text-orange-200">
              <strong>Workflow:</strong> Click "Edit Order" to adjust products and pricing → Save changes → Click "Mark as Approved" to remove from this queue.
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-boxdark rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No FTD orders need approval at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-boxdark rounded-xl border border-stroke dark:border-strokedark overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        Bloom Order #{order.linkedOrder.orderNumber}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                        Needs Review
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      FTD Order: {order.externalId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditOrder(order.linkedOrder.id)}
                      className="px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit Order
                    </button>
                    <button
                      onClick={() => handleApprove(order.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as Approved
                    </button>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recipient</p>
                    <p className="text-sm font-medium text-black dark:text-white">
                      {order.recipientFirstName} {order.recipientLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivery Date</p>
                    <p className="text-sm font-medium text-black dark:text-white">
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">FTD Total</p>
                    <p className="text-sm font-medium text-black dark:text-white">
                      ${order.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-gray-50 dark:bg-meta-4 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Current Order Items:
                  </p>
                  {order.linkedOrder.orderItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No items</p>
                  ) : (
                    <ul className="space-y-1">
                      {order.linkedOrder.orderItems.map((item) => (
                        <li key={item.id} className="text-sm text-gray-700 dark:text-gray-300">
                          {item.quantity}x {item.customName} - ${(item.unitPrice / 100).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
