import { useState, useEffect, useCallback, useMemo } from 'react';
import CommunicationTimeline from './CommunicationTimeline';
import PhoneNoteForm from './PhoneNoteForm';
import SmsComposer from './SmsComposer';
import { Modal } from '@shared/ui/components/ui/modal';
import { formatCurrency } from '@shared/utils/currency';
import { useApiClient } from '@shared/hooks/useApiClient';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { useCommunicationsSocket, CommunicationsSocketEvent } from '@shared/hooks/useCommunicationsSocket';
import { ChevronDownIcon } from '@shared/assets/icons';
import { formatPhoneDisplay } from '@shared/ui/forms/PhoneInput';
import DeliveryEditModal from '@app/components/orders/edit/modals/DeliveryEditModal';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';

interface OrderCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onActivityChanged?: () => void;
  onUnreadCountsUpdated?: (payload: {
    orderId: string;
    orderUnreadCount: number;
    totalUnreadCount: number;
  }) => void;
}

interface RelatedOrder {
  id: string;
  orderNumber: number;
  deliveryDate: string | null;
  status: string;
}

export default function OrderCommunicationModal({
  isOpen,
  onClose,
  order,
  onActivityChanged,
  onUnreadCountsUpdated
}: OrderCommunicationModalProps) {
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([]);
  const [activePanel, setActivePanel] = useState<'phone' | 'sms' | 'delivery' | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState({
    deliveryDate: '',
    deliveryTime: '',
    cardMessage: '',
    specialInstructions: '',
    occasion: '',
    deliveryFee: 0
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  const buildDeliveryDraft = useCallback((source: any) => {
    return {
      deliveryDate: source?.deliveryDate ? source.deliveryDate.split('T')[0] : '',
      deliveryTime: source?.deliveryTime || '',
      cardMessage: source?.cardMessage || '',
      specialInstructions: source?.specialInstructions || '',
      occasion: source?.occasion || '',
      deliveryFee: typeof source?.deliveryFee === 'number' ? source.deliveryFee : 0
    };
  }, []);

  useEffect(() => {
    setAdditionalPhones(order?.additionalPhones || []);
    setDeliveryDraft(buildDeliveryDraft(order));
  }, [buildDeliveryDraft, order?.additionalPhones, order?.id]);

  useEffect(() => {
    setActivePanel(null);
  }, [isOpen, order?.id]);

  const fetchCommunications = useCallback(async () => {
    if (!order?.id) return;

    try {
      setLoading(true);
      const { data, status } = await apiClient.get(`/api/orders/${order.id}/communications`);
      if (status < 400 && data.success) {
        setCommunications(data.communications || []);
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  }, [apiClient, order?.id]);

  const markCommunicationsRead = useCallback(async () => {
    if (!order?.id) return;

    try {
      const { data, status } = await apiClient.patch(
        `/api/orders/${order.id}/communications/mark-read`
      );
      if (status < 400 && data?.success) {
        const orderUnreadCount = Number(data.orderUnreadCount || 0);
        const totalUnreadCount = Number(data.totalUnreadCount || 0);

        onUnreadCountsUpdated?.({
          orderId: order.id,
          orderUnreadCount,
          totalUnreadCount
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('communications:unread-updated', {
              detail: { totalUnreadCount }
            })
          );
        }
      }
    } catch (error) {
      console.error('Failed to mark communications as read:', error);
    }
  }, [apiClient, onUnreadCountsUpdated, order?.id]);

  const fetchRelatedOrders = useCallback(async () => {
    if (!order?.id) return;

    try {
      const { data, status } = await apiClient.get(`/api/orders/${order.id}/related-orders`);
      if (status < 400 && data.success) {
        setRelatedOrders(data.relatedOrders || []);
        if (Array.isArray(data.additionalPhones)) {
          setAdditionalPhones(data.additionalPhones);
        }
      }
    } catch (error) {
      console.error('Failed to fetch related orders:', error);
    }
  }, [apiClient, order?.id]);

  // Fetch communications when modal opens
  useEffect(() => {
    if (isOpen && order?.id) {
      fetchCommunications();
      markCommunicationsRead();
      fetchRelatedOrders();
    }
  }, [fetchCommunications, fetchRelatedOrders, isOpen, markCommunicationsRead, order?.id]);

  const handleAddPhone = async () => {
    if (!newPhone.trim() || !order?.id) return;

    try {
      const { data, status } = await apiClient.post(`/api/orders/${order.id}/additional-phones`, {
        phone: newPhone
      });
      if (status < 400 && data.success) {
        setAdditionalPhones(data.additionalPhones);
        setNewPhone('');
        fetchRelatedOrders(); // Refresh related orders
      }
    } catch (error) {
      console.error('Failed to add phone:', error);
    }
  };

  const handleRemovePhone = async (phone: string) => {
    if (!order?.id) return;

    try {
      const { data, status } = await apiClient.delete(`/api/orders/${order.id}/additional-phones/${phone}`);
      if (status < 400 && data.success) {
        setAdditionalPhones(data.additionalPhones);
        fetchRelatedOrders();
      }
    } catch (error) {
      console.error('Failed to remove phone:', error);
    }
  };

  const handlePhoneNoteSubmit = async (noteData: any) => {
    try {
      const { data, status } = await apiClient.post(`/api/orders/${order.id}/communications`, {
        type: 'PHONE_CALL',
        status: noteData.status,
        quickActions: noteData.quickActions,
        message: noteData.notes,
        employeeId: null // TODO: Get from auth context
      });

      if (status < 400 && data.success) {
        // Refresh communications
        fetchCommunications();
        onActivityChanged?.();
      }
    } catch (error) {
      console.error('Failed to save phone note:', error);
    }
  };

  const handleSmsSend = async (message: string, phoneNumber: string) => {
    try {
      const { data, status } = await apiClient.post(`/api/orders/${order.id}/sms`, {
        phoneNumber,
        message,
        employeeId: null // TODO: Get from auth context
      });

      if (status < 400 && data.success) {
        // Refresh communications
        fetchCommunications();
        onActivityChanged?.();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  };

  const handleDeliverySave = async () => {
    if (!order?.id) return;

    setSavingDelivery(true);
    try {
      const payload = {
        deliveryDate: deliveryDraft.deliveryDate || null,
        deliveryTime: deliveryDraft.deliveryTime || null,
        cardMessage: deliveryDraft.cardMessage || null,
        specialInstructions: deliveryDraft.specialInstructions || null,
        occasion: deliveryDraft.occasion || null,
        deliveryFee: Math.round(deliveryDraft.deliveryFee || 0)
      };

      const { data, status } = await apiClient.put(`/api/orders/${order.id}/update`, payload);
      if (status < 400 && data?.success) {
        if (data.order) {
          setDeliveryDraft(buildDeliveryDraft(data.order));
        }
        setActivePanel(null);
        onActivityChanged?.();
      }
    } catch (error) {
      console.error('Failed to update delivery details:', error);
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleDeliveryCancel = () => {
    setDeliveryDraft(buildDeliveryDraft(order));
    setActivePanel(null);
  };

  const handleSocketEvent = useCallback(
    (event: CommunicationsSocketEvent) => {
      if (!isOpen || event.data.orderId !== order?.id) return;

      if (event.type === 'sms:received') {
        fetchCommunications();
        onActivityChanged?.();

        if (typeof event.data.orderUnreadCount === 'number' && typeof event.data.totalUnreadCount === 'number') {
          onUnreadCountsUpdated?.({
            orderId: order.id,
            orderUnreadCount: event.data.orderUnreadCount,
            totalUnreadCount: event.data.totalUnreadCount
          });
        }
      }

      if (event.type === 'sms:status_updated') {
        setCommunications((prev) =>
          prev.map((c) =>
            c.id === event.data.communicationId ? { ...c, status: event.data.status } : c
          )
        );
      }
    },
    [fetchCommunications, isOpen, onUnreadCountsUpdated, order?.id]
  );

  useCommunicationsSocket(handleSocketEvent, isOpen);

  const customerPhone = order?.customer?.phone;
  const addressPhone = order?.deliveryAddress?.phone;
  const recipientCustomerPhone = order?.recipientCustomer?.phone;
  const recipientPhone = addressPhone || recipientCustomerPhone;
  const phoneOptions = useMemo(() => {
    const options: Array<{ label: string; value: string }> = [];

    if (customerPhone) {
      options.push({
        label: `Customer • ${formatPhoneDisplay(customerPhone)}`,
        value: customerPhone
      });
    }

    if (addressPhone) {
      options.push({
        label: `Recipient (Address) • ${formatPhoneDisplay(addressPhone)}`,
        value: addressPhone
      });
    }

    if (recipientCustomerPhone && recipientCustomerPhone !== addressPhone) {
      options.push({
        label: `Recipient • ${formatPhoneDisplay(recipientCustomerPhone)}`,
        value: recipientCustomerPhone
      });
    }

    additionalPhones.forEach((phone, index) => {
      options.push({
        label: `Additional ${index + 1} • ${formatPhoneDisplay(phone)}`,
        value: phone
      });
    });

    const seen = new Set<string>();
    return options.filter((option) => {
      const normalized = option.value.trim();
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }, [additionalPhones, customerPhone, recipientPhone]);

  const togglePanel = (panel: 'phone' | 'sms' | 'delivery') => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[92vw] max-w-5xl overflow-hidden"
    >
      <div className="flex flex-col h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Customer Communication - Order #{formatOrderNumber(order?.orderNumber, orderNumberPrefix)}
          </h2>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Side - Order Summary */}
          <div className="w-1/3 p-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto min-h-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Order Details</h3>

            <div className="space-y-3">
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
                    {formatPhoneDisplay(customerPhone)}
                  </a>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recipient</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order?.deliveryAddress?.firstName || order?.recipientCustomer?.firstName} {order?.deliveryAddress?.lastName || order?.recipientCustomer?.lastName}
                </p>
                {recipientPhone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPhoneDisplay(recipientPhone)}
                  </p>
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Delivery</p>
                  <button
                    type="button"
                    onClick={() => togglePanel('delivery')}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    Edit
                  </button>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {deliveryDraft.deliveryDate
                    ? new Date(`${deliveryDraft.deliveryDate}T00:00:00`).toLocaleDateString()
                    : 'Not set'}
                </p>
                {deliveryDraft.deliveryTime ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {deliveryDraft.deliveryTime}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">No time specified</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order?.paymentAmount || 0)}
                </p>
              </div>

              {deliveryDraft.specialInstructions && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Special Instructions</p>
                  <p className="text-sm text-gray-900 dark:text-white">{deliveryDraft.specialInstructions}</p>
                </div>
              )}

              {/* Additional Phones */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Additional Contacts</p>
                {additionalPhones.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {additionalPhones.map((phone) => (
                      <div key={phone} className="flex items-center justify-between text-sm">
                        <a href={`tel:${phone}`} className="text-blue-500 hover:underline">
                          {phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                        </a>
                        <button
                          onClick={() => handleRemovePhone(phone)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Add phone..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddPhone}
                    disabled={!newPhone.trim()}
                    className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Related Orders */}
              {relatedOrders.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Related Orders</p>
                  <div className="space-y-1">
                    {relatedOrders.map((ro) => (
                      <div
                        key={ro.id}
                        className="text-xs bg-gray-50 dark:bg-gray-800 rounded px-2 py-1"
                      >
                        <span className="font-medium">
                          #{formatOrderNumber(ro.orderNumber, orderNumberPrefix)}
                        </span>
                        {ro.deliveryDate && (
                          <span className="text-gray-500 ml-2">
                            {new Date(ro.deliveryDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-gray-400 ml-2">{ro.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Communication Hub */}
          <div className="w-2/3 flex flex-col min-h-0">
            {/* Scrollable Communication Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => togglePanel('delivery')}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Delivery Details
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform ${
                      activePanel === 'delivery' ? 'rotate-180 text-brand-500' : 'text-gray-400'
                    }`}
                  />
                </button>
                {activePanel === 'delivery' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <DeliveryEditModal
                      delivery={deliveryDraft}
                      onChange={setDeliveryDraft}
                      onSave={handleDeliverySave}
                      onCancel={handleDeliveryCancel}
                      saving={savingDelivery}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => togglePanel('phone')}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Phone Call Notes
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform ${
                      activePanel === 'phone' ? 'rotate-180 text-brand-500' : 'text-gray-400'
                    }`}
                  />
                </button>
                {activePanel === 'phone' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <PhoneNoteForm onSubmit={handlePhoneNoteSubmit} variant="plain" showHeader={false} />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => togglePanel('sms')}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Send SMS
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform ${
                      activePanel === 'sms' ? 'rotate-180 text-brand-500' : 'text-gray-400'
                    }`}
                  />
                </button>
                {activePanel === 'sms' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <SmsComposer
                      onSend={handleSmsSend}
                      defaultPhone={recipientPhone || customerPhone || ''}
                      recipientName={order?.deliveryAddress?.firstName || order?.recipientCustomer?.firstName || order?.customer?.firstName}
                      address={order?.deliveryAddress ? `${order.deliveryAddress.address1}${order.deliveryAddress.address2 ? `, ${order.deliveryAddress.address2}` : ''}, ${order.deliveryAddress.city}` : undefined}
                      phoneOptions={phoneOptions}
                      variant="plain"
                      showHeader={false}
                    />
                  </div>
                )}
              </div>

              <CommunicationTimeline
                communications={communications}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
