import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FtdOrder } from '../../../domains/ftd/types/ftdTypes';

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

  const handleMarkReviewed = async (orderId: string) => {
    try {
      const res = await fetch(`/api/ftd/orders/${orderId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
      }
    } catch (error) {
      console.error('Failed to mark order as reviewed:', error);
    }
  };

const renderFtdDetails = (order: FtdOrder) => {
  const payload = order.importedPayload || {};
  const deliveryInfo = payload.deliveryInfo || payload.delivery_info || {};
  const recipient = payload.recipientInfo || payload.recipient || {};
  const price = payload.totals?.total ?? payload.price?.find((p: any) => p.name === 'orderTotal')?.value ?? order.paymentAmount;
  const cardMessage = payload.cardMessage || payload.card_message || order.cardMessage;
  const instructions = deliveryInfo.deliveryInstructions || deliveryInfo.delivery_instructions;
  const productDescription = payload.productDescription || payload.products?.[0]?.product_description;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">FTD Details</h4>
      <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Status</p>
            <p>{order.externalStatus || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Recipient</p>
            <p>{`${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || '—'}</p>
            <p>{recipient.phone || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Delivery</p>
            <p>{deliveryInfo.deliveryDate || '—'}</p>
            <p>{deliveryInfo.deliveryTimeWindow || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Product</p>
            <p className="line-clamp-3">{productDescription || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Card Message</p>
            <p className="whitespace-pre-wrap">{cardMessage || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Instructions</p>
            <p className="whitespace-pre-wrap">{instructions || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Amount</p>
            <p>${Number(price || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderBloomDetails = (order: FtdOrder) => {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Bloom Order</h4>
        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Order #</p>
            <p>#{order.orderNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Status</p>
            <p>{order.status}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Customer</p>
            <p>
              {order.customer
                ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim() || '—'
                : '—'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Delivery</p>
            <p>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleString() : '—'}</p>
            <p>{order.deliveryAddress ? `${order.deliveryAddress.address1 || ''} ${order.deliveryAddress.city || ''}`.trim() : ''}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Items</p>
            <ul className="space-y-1">
              {order.orderItems.length === 0 ? (
                <li>—</li>
              ) : (
                order.orderItems.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {item.customName || 'Custom Item'} — ${(item.unitPrice / 100).toFixed(2)}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Notes</p>
            <p className="whitespace-pre-wrap">{order.specialInstructions || '—'}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white">FTD Orders - Review Queue</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Compare FTD details with the Bloom order before fulfilling.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-boxdark rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3>
          <p className="text-gray-600 dark:text-gray-400">No FTD orders need review right now.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-boxdark rounded-xl border border-stroke dark:border-strokedark p-6"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 lg:border-r lg:border-gray-200 lg:dark:border-white/10 lg:pr-6">
                  {renderBloomDetails(order)}
                </div>
                <div className="flex-1 lg:pl-6">
                  {renderFtdDetails(order)}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(order.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditOrder(order.id)}
                    className="px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit Bloom Order
                  </button>
                  <button
                    onClick={() => handleMarkReviewed(order.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Mark Reviewed
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
