import { useState, useEffect } from 'react';
import CommunicationTimeline from './CommunicationTimeline';
import PhoneNoteForm from './PhoneNoteForm';
import SmsComposer from './SmsComposer';

interface OrderCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export default function OrderCommunicationModal({ isOpen, onClose, order }: OrderCommunicationModalProps) {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState(order?.deliveryTime || '');

  // Fetch communications when modal opens
  useEffect(() => {
    if (isOpen && order?.id) {
      fetchCommunications();
    }
  }, [isOpen, order?.id]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${order.id}/communications`);
      const data = await response.json();
      if (data.success) {
        setCommunications(data.communications);
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneNoteSubmit = async (noteData: any) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PHONE_CALL',
          status: noteData.status,
          quickActions: noteData.quickActions,
          message: noteData.notes,
          employeeId: null // TODO: Get from auth context
        })
      });

      const data = await response.json();
      if (data.success) {
        // Refresh communications
        fetchCommunications();
      }
    } catch (error) {
      console.error('Failed to save phone note:', error);
    }
  };

  const handleSmsSend = async (message: string, phoneNumber: string) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          message,
          employeeId: null // TODO: Get from auth context
        })
      });

      const data = await response.json();
      if (data.success) {
        // Refresh communications
        fetchCommunications();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  };

  const handleDeliveryTimeUpdate = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}/delivery-time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryTime })
      });

      const data = await response.json();
      if (data.success) {
        alert('Delivery time updated!');
      }
    } catch (error) {
      console.error('Failed to update delivery time:', error);
    }
  };

  if (!isOpen) return null;

  const customerPhone = order?.customer?.phone;
  const recipientPhone = order?.deliveryAddress?.phone;
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Customer Communication - Order #{order?.orderNumber}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Order Summary */}
          <div className="w-1/3 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Details</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className="font-medium text-gray-900 dark:text-white">{order?.status}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order?.customer?.firstName} {order?.customer?.lastName}
                </p>
                {customerPhone && (
                  <a href={`tel:${customerPhone}`} className="text-blue-500 hover:underline text-sm">
                    {customerPhone}
                  </a>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recipient</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order?.deliveryAddress?.firstName} {order?.deliveryAddress?.lastName}
                </p>
                {recipientPhone && (
                  <a href={`tel:${recipientPhone}`} className="text-blue-500 hover:underline text-sm">
                    {recipientPhone}
                  </a>
                )}
                {order?.deliveryAddress && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {order.deliveryAddress.address1}
                    {order.deliveryAddress.address2 && `, ${order.deliveryAddress.address2}`}
                    <br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Delivery</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order?.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Not set'}
                </p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleDeliveryTimeUpdate}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order?.paymentAmount || 0)}
                </p>
              </div>

              {order?.specialInstructions && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Special Instructions</p>
                  <p className="text-sm text-gray-900 dark:text-white">{order.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Communication Hub */}
          <div className="w-2/3 flex flex-col">
            {/* Contact Actions */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                {customerPhone && (
                  <a
                    href={`tel:${customerPhone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors"
                  >
                    📞 Call Customer
                  </a>
                )}
                {recipientPhone && recipientPhone !== customerPhone && (
                  <a
                    href={`tel:${recipientPhone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors"
                  >
                    📞 Call Recipient
                  </a>
                )}
              </div>
            </div>

            {/* Scrollable Communication Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <PhoneNoteForm onSubmit={handlePhoneNoteSubmit} />

              <SmsComposer
                onSend={handleSmsSend}
                defaultPhone={customerPhone || recipientPhone || ''}
              />

              <CommunicationTimeline
                communications={communications}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
