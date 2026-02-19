import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import { Modal } from '@shared/ui/components/ui/modal';
import OrderHeader from '@app/components/orders/edit/OrderHeader';
import OrderSections from '@app/components/orders/edit/OrderSections';
import OrderCommunicationModal from '@app/components/delivery/OrderCommunicationModal';
import { Order } from '@app/components/orders/types';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { useApiClient } from '@shared/hooks/useApiClient';
import { useCommunicationsSocket, CommunicationsSocketEvent } from '@shared/hooks/useCommunicationsSocket';
import { toast } from 'sonner';

const splitRecipientName = (name?: string | null) => {
  if (!name) {
    return { firstName: '', lastName: '' };
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const formatPaymentMethodLabel = (method: any) => {
  if (!method) return 'Payment';

  const type = method.type ? String(method.type) : '';
  const provider = method.provider ? String(method.provider) : '';
  const cardSuffix = method.cardLast4 ? ` ending in ${method.cardLast4}` : '';

  if (type === 'CARD') {
    const providerLabel = provider || 'Card';
    return `${providerLabel} Card${cardSuffix}`;
  }

  const typeLabel = type
    ? type
        .toLowerCase()
        .split('_')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Payment';

  return typeLabel;
};

const resolveAdjustmentChannel = (orderSource?: string) => {
  const normalized = orderSource?.toUpperCase();
  if (normalized === 'PHONE') return 'PHONE';
  if (normalized === 'POS' || normalized === 'WALKIN') return 'POS';
  return 'WEBSITE';
};

// Convert domain Order to frontend Order format
const mapDomainOrderToFrontend = (domainOrder: DomainOrder): Order => {
  return {
    id: domainOrder.id,
    orderNumber: parseInt(domainOrder.orderNumber),
    status: domainOrder.status,
    type: domainOrder.orderType as any, // TODO: Map domain OrderType to frontend OrderType
    createdAt: domainOrder.createdAt 
      ? (domainOrder.createdAt instanceof Date 
          ? domainOrder.createdAt.toISOString() 
          : new Date(domainOrder.createdAt).toISOString()) 
      : new Date().toISOString(),
    deliveryDate: domainOrder.requestedDeliveryDate?.toISOString().split('T')[0] || null,
    deliveryTime: domainOrder.deliveryInfo?.scheduledTimeSlot?.toString() || null,
    paymentAmount: domainOrder.totalAmount.amount,
    deliveryFee: domainOrder.deliveryFee.amount,
    discount: 0, // TODO: Calculate from appliedDiscounts
    gst: domainOrder.taxBreakdown.find(t => t.taxType?.toUpperCase().includes('GST'))?.taxAmount?.amount || 0,
    pst: domainOrder.taxBreakdown.find(t => t.taxType?.toUpperCase().includes('PST'))?.taxAmount?.amount || 0,
    cardMessage: domainOrder.cardMessage || null,
    specialInstructions: domainOrder.specialInstructions || null,
    occasion: domainOrder.occasion || null,
    customer: {
      id: domainOrder.customerId,
      firstName: domainOrder.customerSnapshot?.firstName || 'Unknown',
      lastName: domainOrder.customerSnapshot?.lastName || 'Customer',
      email: domainOrder.customerSnapshot?.email || '',
      phone: domainOrder.customerSnapshot?.phone || '',
    },
    recipientCustomer: domainOrder.recipientCustomer ? {
      id: domainOrder.recipientCustomer.id,
      firstName: domainOrder.recipientCustomer.firstName,
      lastName: domainOrder.recipientCustomer.lastName,
      email: domainOrder.recipientCustomer.email || '',
      phone: domainOrder.recipientCustomer.phone || '',
    } : undefined,
    recipientName: domainOrder.recipientName || domainOrder.deliveryInfo?.recipientName || null,
    deliveryAddress: domainOrder.deliveryInfo ? {
      id: domainOrder.deliveryInfo.deliveryAddress?.id || domainOrder.id,
      firstName: domainOrder.deliveryInfo.recipientName?.split(' ')[0] || '',
      lastName: domainOrder.deliveryInfo.recipientName?.split(' ').slice(1).join(' ') || '',
      company: undefined,
      phone: domainOrder.deliveryInfo.recipientPhone || '',
      address1: domainOrder.deliveryInfo.deliveryAddress?.street1 || '',
      address2: domainOrder.deliveryInfo.deliveryAddress?.street2,
      city: domainOrder.deliveryInfo.deliveryAddress?.city || '',
      province: domainOrder.deliveryInfo.deliveryAddress?.province || '',
      postalCode: domainOrder.deliveryInfo.deliveryAddress?.postalCode || '',
      country: domainOrder.deliveryInfo.deliveryAddress?.country || 'Canada',
    } : undefined,
    orderItems: domainOrder.items.map(item => ({
      id: item.id,
      customName: item.name,
      description: item.description || null,
      unitPrice: item.unitPrice.amount,
      quantity: item.quantity,
      rowTotal: item.totalPrice?.amount ?? (item.unitPrice.amount * item.quantity),
    })),
    orderSource: domainOrder.orderSource,
    images: domainOrder.images || [],
    taxBreakdown: domainOrder.taxBreakdown.map(tax => ({
      name: tax.taxType,
      amount: tax.taxAmount?.amount || 0,
    })),
    paymentStatus: domainOrder.paymentStatus,
  };
};
// MIGRATION: Use domain hook for order management
import { useOrderManagement } from '@domains/orders/hooks/useOrderManagement';
import { Order as DomainOrder, OrderType as DomainOrderType, OrderStatus } from '@domains/orders/entities/Order';

// Import all modal components
import CustomerEditModal from '@app/components/orders/edit/modals/CustomerEditModal';
import RecipientEditModal from '@app/components/orders/edit/modals/RecipientEditModal';
import DeliveryEditModal from '@app/components/orders/edit/modals/DeliveryEditModal';
import ProductsEditModal from '@app/components/orders/edit/modals/ProductsEditModal';
import PaymentEditModal from '@app/components/orders/edit/modals/PaymentEditModal';
import ImagesEditModal from '@app/components/orders/edit/modals/ImagesEditModal';
import PaymentAdjustmentModal, { PaymentMethod, PaymentAdjustmentResult } from '@app/components/orders/edit/modals/PaymentAdjustmentModal';
import RefundModal from '@app/components/refunds/RefundModal';
import ReceiptInvoiceModal from '@app/components/orders/ReceiptInvoiceModal';

interface OrderPaymentInfo {
  transactionId: string;
  transactionNumber: string;
  paymentMethods: PaymentMethod[];
}

const OrderEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getBusinessDateString } = useBusinessTimezone();
  const apiClient = useApiClient();
  
  // MIGRATION: Use domain hook for order management
  const { order: domainOrder, loading, saving, error, fetchOrder, updateOrderStatus, updateOrderField, updateOrderDirect } = useOrderManagement(id);
  const order = domainOrder ? mapDomainOrderToFrontend(domainOrder) : null;
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState<OrderPaymentInfo | null>(null);
  
  // Edit states
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingRecipient, setEditingRecipient] = useState<any>(null);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [editingProducts, setEditingProducts] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);

  // Payment adjustment states
  const [showPaymentAdjustment, setShowPaymentAdjustment] = useState(false);
  const [paymentAdjustmentData, setPaymentAdjustmentData] = useState<{
    oldTotal: number;
    newTotal: number;
    revertData: any; // Data to revert the order if user cancels
  } | null>(null);

  // Refund modal states
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundTransactionNumber, setRefundTransactionNumber] = useState<string | null>(null);

  // Print/Email modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // MIGRATION: Order auto-loads via useOrderManagement hook when id changes
  const handleUnreadCountsUpdated = useCallback(
    (payload: { orderId: string; orderUnreadCount: number; totalUnreadCount: number }) => {
      if (!order?.id || payload.orderId !== order.id) return;
      setUnreadCount(payload.orderUnreadCount);
      // Update header bell badge immediately
      window.dispatchEvent(
        new CustomEvent('communications:unread-updated', {
          detail: { totalUnreadCount: payload.totalUnreadCount }
        })
      );
    },
    [order?.id]
  );

  const handleCommunicationsEvent = useCallback(
    (event: CommunicationsSocketEvent) => {
      if (event.type !== 'sms:received' || event.data.orderId !== order?.id) return;

      setUnreadCount((prev) =>
        typeof event.data.orderUnreadCount === 'number' ? event.data.orderUnreadCount : prev + 1
      );
    },
    [order?.id]
  );

  useCommunicationsSocket(handleCommunicationsEvent, Boolean(order?.id));

  useEffect(() => {
    if (!order?.id) {
      setUnreadCount(0);
      return;
    }

    let isActive = true;

    const loadUnreadCount = async () => {
      try {
        const { data, status } = await apiClient.get(`/api/orders/${order.id}/communications`);
        if (!isActive) return;
        if (status < 400 && data?.success) {
          const count = Array.isArray(data.communications)
            ? data.communications.filter(
                (comm: any) => comm.type === 'SMS_RECEIVED' && !comm.readAt
              ).length
            : 0;
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('Failed to load communications:', error);
      }
    };

    loadUnreadCount();

    return () => {
      isActive = false;
    };
  }, [apiClient, order?.id]);

  useEffect(() => {
    if (!order?.id) {
      setPaymentInfo(null);
      return;
    }

    let isActive = true;

    const loadPaymentInfo = async () => {
      try {
        const { data, status } = await apiClient.get(`/api/payment-transactions/order/${order.id}`);
        if (!isActive) return;

        if (status >= 400 || !Array.isArray(data) || data.length === 0) {
          setPaymentInfo(null);
          return;
        }

        // Get the most recent non-adjustment transaction
        const transactions = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const primaryTransaction = transactions[0];

        if (!primaryTransaction?.paymentMethods?.length) {
          setPaymentInfo(null);
          return;
        }

        // Collect all payment methods from the transaction
        const paymentMethods: PaymentMethod[] = primaryTransaction.paymentMethods.map((method: any) => ({
          id: method.id,
          type: method.type,
          provider: method.provider || 'INTERNAL',
          amount: method.amount,
          cardLast4: method.cardLast4,
          cardBrand: method.cardBrand,
          providerTransactionId: method.providerTransactionId,
          label: formatPaymentMethodLabel(method)
        }));

        setPaymentInfo({
          transactionId: primaryTransaction.id,
          transactionNumber: primaryTransaction.transactionNumber,
          paymentMethods
        });
      } catch (error) {
        console.error('Failed to load payment info:', error);
        setPaymentInfo(null);
      }
    };

    loadPaymentInfo();

    return () => {
      isActive = false;
    };
  }, [apiClient, order?.id]);

  // MIGRATION: Handle status change using domain hook
  const handleStatusChange = async (newStatus: string) => {
    const status = newStatus as any; // TODO: Proper type casting
    try {
      await updateOrderStatus(status);
      // Order is automatically refreshed by the domain hook
      toast.success('Order status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Handle Cancel/Refund button click
  // Uses `id` from URL params directly to avoid stale closure on `order`
  const handleCancelRefund = async () => {
    if (!id || !order) return;

    try {
      // Fetch transactions for this order
      const response = await fetch(`/api/payment-transactions/order/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const transactions = await response.json();

      if (!transactions || transactions.length === 0) {
        // No payment transaction - cancel without refund
        if (confirm('This order has no payment transaction record. Cancel order without processing a refund?')) {
          const { data, status } = await apiClient.patch(`/api/orders/${id}/status`, {
            status: 'CANCELLED',
          });
          if (status >= 400 || !data?.success) {
            toast.error(data?.error || 'Failed to cancel order');
          } else {
            await fetchOrder(id);
            toast.success('Order cancelled');
          }
        }
        return;
      }

      // Open refund modal with first transaction
      setRefundTransactionNumber(transactions[0].transactionNumber);
      setRefundModalOpen(true);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // If we can't fetch transactions, offer to cancel without refund
      if (confirm('Unable to load payment information. This may be an old imported order. Cancel order without processing a refund?')) {
        const { data, status } = await apiClient.patch(`/api/orders/${id}/status`, {
          status: 'CANCELLED',
        });
        if (status >= 400 || !data?.success) {
          toast.error(data?.error || 'Failed to cancel order');
        } else {
          await fetchOrder(id);
          toast.success('Order cancelled');
        }
      }
    }
  };

  // Handle refund completion - cancel order via status endpoint directly
  // Uses `id` from URL params to avoid stale closure
  const handleRefundComplete = async () => {
    if (!id) return;

    try {
      const { data, status } = await apiClient.patch(`/api/orders/${id}/status`, {
        status: 'CANCELLED',
        skipRefund: true,
      });

      setRefundModalOpen(false);
      setRefundTransactionNumber(null);

      if (status >= 400 || !data?.success) {
        toast.error(data?.error || 'Failed to cancel order');
        return;
      }

      // Refresh order to get updated state
      await fetchOrder(id);
      toast.success('Order cancelled');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const openModal = (modalType: string) => {
    if (!order) return;
    
    switch (modalType) {
      case 'customer':
        setEditingCustomer({ ...order.customer });
        break;
      case 'recipient':
        // Use deliveryAddress from NEW system
        if (order.deliveryAddress) {
          setEditingRecipient({
            ...order.deliveryAddress
          });
          break;
        }

        const fallbackName = order.recipientCustomer
          ? `${order.recipientCustomer.firstName || ''} ${order.recipientCustomer.lastName || ''}`.trim()
          : order.recipientName || '';
        const { firstName, lastName } = splitRecipientName(fallbackName);

        setEditingRecipient({
          firstName,
          lastName,
          company: '',
          phone: order.recipientCustomer?.phone || '',
          address1: '',
          address2: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'CA',
          addressType: 'RESIDENCE'
        });
        break;
      case 'delivery':
        setEditingDelivery({
          deliveryDate: order.deliveryDate && getBusinessDateString ? 
            getBusinessDateString(new Date(order.deliveryDate)) : 
            (order.deliveryDate ? order.deliveryDate.split('T')[0] : ''),
          deliveryTime: order.deliveryTime || '',
          cardMessage: order.cardMessage || '',
          specialInstructions: order.specialInstructions || '',
          occasion: order.occasion || '',
          deliveryFee: order.deliveryFee
        });
        break;
      case 'products':
        setEditingProducts([...order.orderItems]);
        break;
      case 'payment':
        setEditingPayment({
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          gst: order.gst,
          pst: order.pst
        });
        break;
      case 'images':
        console.log('Opening images modal with order images:', order.images);
        const currentImages = Array.isArray(order.images) ? order.images : [];
        console.log('Setting editingImages to:', currentImages);
        setEditingImages([...currentImages]);
        break;
    }
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingCustomer(null);
    setEditingRecipient(null);
    setEditingDelivery(null);
    setEditingProducts([]);
    setEditingPayment(null);
    setEditingImages([]);
    // setUpdateCustomerDatabase(false); // TODO: Add state variable if needed
  };

  // Modified saveSection to accept direct data and handle payment adjustments
  const saveSection = async (section: string, directData?: any) => {
    try {
      // Store the old total and values for potential revert
      const oldTotal = order?.paymentAmount || 0;

      // Capture revert data based on section being edited
      let revertData: any = {};
      if (section === 'products') {
        // For products, we need to revert order items
        revertData = {
          orderItems: order?.orderItems?.map(item => ({
            customName: item.customName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            rowTotal: item.rowTotal
          })),
          recalculateTotal: true
        };
      } else {
        // For other sections, revert fee/discount/tax
        revertData = {
          deliveryFee: order?.deliveryFee,
          discount: order?.discount,
          gst: order?.gst,
          pst: order?.pst
        };
      }

      let updateData: any = {};
      
      switch (section) {
        case 'customer':
          updateData = { customer: editingCustomer };
          break;
        case 'recipient':
          if (order?.deliveryAddress) {
            updateData = {
              deliveryAddress: editingRecipient
            };
          } else {
            const fullName = `${editingRecipient.firstName || ''} ${editingRecipient.lastName || ''}`.trim();
            updateData = {
              recipientName: fullName || null
            };
          }
          break;
        case 'delivery':
          updateData = { 
            deliveryDate: editingDelivery.deliveryDate || null,
            deliveryTime: editingDelivery.deliveryTime || null,
            cardMessage: editingDelivery.cardMessage || null,
            specialInstructions: editingDelivery.specialInstructions || null,
            occasion: editingDelivery.occasion || null,
            deliveryFee: Math.round(editingDelivery.deliveryFee || 0)
          };
          break;
        case 'products':
          const processedProducts = editingProducts.map(item => ({
            ...item,
            unitPrice: parseInt(item.unitPrice) || 0,
            quantity: parseInt(item.quantity) || 1,
            rowTotal: (parseInt(item.unitPrice) || 0) * (parseInt(item.quantity) || 1)
          }));
          
          updateData = { 
            orderItems: processedProducts,
            recalculateTotal: true
          };
          console.log('Sending products update:', processedProducts);
          break;
        case 'payment':
          updateData = { 
            deliveryFee: Math.round(editingPayment.deliveryFee || 0),
            discount: Math.round(editingPayment.discount || 0),
            gst: Math.round(editingPayment.gst || 0),
            pst: Math.round(editingPayment.pst || 0)
          };
          break;
        case 'images':
          // Use directData if provided, otherwise fall back to editingImages
          const imagesToSave = directData || editingImages;
          console.log('=== IMAGES DEBUG ===');
          console.log('directData:', directData);
          console.log('editingImages state:', editingImages);
          console.log('Using images:', imagesToSave);
          console.log('=== END IMAGES DEBUG ===');
          updateData = { images: imagesToSave };
          break;
      }

      console.log('Sending update data:', updateData);
      console.log('editingRecipient state:', editingRecipient);

      // MIGRATION: Use domain hook for updates
      // For products (and other sections with multiple fields), use updateOrderDirect
      // to avoid double-wrapping. For single field updates, use updateOrderField.
      let result;
      if (section === 'products' || section === 'delivery' || section === 'payment' || section === 'images' || section === 'recipient') {
        result = await updateOrderDirect(updateData);
      } else {
        result = await updateOrderField(section, updateData[section] || updateData);
      }
      console.log('Update result:', result);
      
      if (result) {
        // result is domain Order with totalAmount.amount, order is mapped frontend with paymentAmount
        const newTotal = result?.totalAmount?.amount ?? order?.paymentAmount ?? 0;
        
        // Check if payment adjustment is needed (for differences of $0.50 or more)
        if (Math.abs(newTotal - oldTotal) >= 50) {
          setPaymentAdjustmentData({
            oldTotal,
            newTotal,
            revertData
          });
          setShowPaymentAdjustment(true);
        }

        closeModal();
        // Order is automatically refreshed by the domain hook
        console.log('Order updated successfully');
        toast.success('Order updated');
      } else {
        console.error('Update failed - result was null');
        toast.error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  // Payment adjustment handlers
  const handlePaymentAdjustmentComplete = async (adjustmentData: PaymentAdjustmentResult) => {
    try {
      const orderId = order?.id;
      const customerId = order?.customer?.id;
      const transactionId = paymentInfo?.transactionId;
      const isRefund = (paymentAdjustmentData?.newTotal || 0) < (paymentAdjustmentData?.oldTotal || 0);

      if (adjustmentData.success && orderId && adjustmentData.amount > 0) {
        // Create PT record for the adjustment
        if (isRefund && transactionId) {
          // Record refund against original transaction
          await apiClient.post(`/api/payment-transactions/${transactionId}/refunds`, {
            amount: adjustmentData.amount,
            reason: adjustmentData.notes || 'Order adjustment refund',
            refundMethods: [{
              paymentMethodType: adjustmentData.paymentMethodType,
              provider: adjustmentData.provider,
              amount: adjustmentData.amount,
              providerRefundId: adjustmentData.providerRefundId
            }]
          });
        } else if (!isRefund && customerId) {
          // Create new transaction for additional charge
          await apiClient.post('/api/payment-transactions', {
            customerId,
            channel: resolveAdjustmentChannel(order?.orderSource),
            totalAmount: adjustmentData.amount,
            taxAmount: 0,
            notes: adjustmentData.notes || 'Order adjustment',
            paymentMethods: [{
              type: adjustmentData.paymentMethodType,
              provider: adjustmentData.provider,
              amount: adjustmentData.amount,
              providerTransactionId: adjustmentData.providerTransactionId,
              cardLast4: adjustmentData.cardLast4,
              cardBrand: adjustmentData.cardBrand
            }],
            orderIds: [orderId],
            isAdjustment: true,
            orderPaymentAllocations: [{ orderId, amount: adjustmentData.amount }]
          });
        }

        // Save note
        if (adjustmentData.notes) {
          await apiClient.post(`/api/orders/${orderId}/communications`, {
            type: 'NOTE',
            message: adjustmentData.notes
          });
        }
      }

      setShowPaymentAdjustment(false);
      setPaymentAdjustmentData(null);
    } catch (error) {
      console.error('Error recording payment adjustment:', error);
      toast.error('Payment processed but failed to record. Please add manual note.');
      setShowPaymentAdjustment(false);
      setPaymentAdjustmentData(null);
    }
  };

  const handlePaymentAdjustmentCancel = async () => {
    // Revert the order to previous values
    if (paymentAdjustmentData?.revertData && order?.id) {
      try {
        await updateOrderDirect(paymentAdjustmentData.revertData);
      } catch (error) {
        console.error('Failed to revert order:', error);
        toast.error('Failed to revert order changes');
      }
    }
    setShowPaymentAdjustment(false);
    setPaymentAdjustmentData(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </div>
    );
  }

  // MIGRATION: Enhanced error handling
  if (error) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <div className="text-lg font-medium">Error Loading Order</div>
            <div className="text-sm">{error}</div>
            <button 
              onClick={() => fetchOrder(id || "")}
              className="mt-3 text-sm text-brand-500 hover:text-brand-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Order not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageBreadcrumb />

      <div className="max-w-4xl mx-auto">
      <OrderHeader
        order={order}
        onStatusChange={handleStatusChange}
        onCancelRefund={handleCancelRefund}
        onPrintOptions={() => setPrintModalOpen(true)}
        onEmailOptions={() => setEmailModalOpen(true)}
        onContact={() => setCommunicationModalOpen(true)}
        unreadCount={unreadCount}
      />

      <ComponentCard title="Order Details">
        <OrderSections 
          order={order} 
          onEdit={openModal} 
        />
      </ComponentCard>
      </div>

      {/* Main Edit Modal */}
      <Modal
        isOpen={activeModal !== null}
        onClose={closeModal}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Edit {activeModal?.charAt(0).toUpperCase()}{activeModal?.slice(1)}
          </h2>

          {activeModal === 'customer' && (
            <CustomerEditModal
              customer={editingCustomer || { firstName: '', lastName: '', email: '', phone: '' }}
              onChange={setEditingCustomer}
              onSave={() => saveSection('customer')}
              onCancel={closeModal}
              saving={saving}
            />
          )}

          {activeModal === 'recipient' && (
            <RecipientEditModal
              recipient={editingRecipient || {
                firstName: '',
                lastName: '',
                company: '',
                phone: '',
                address1: '',
                address2: '',
                city: '',
                province: '',
                postalCode: '',
                country: 'CA',
                addressType: 'RESIDENCE'
              }}
              onChange={(updated) => {
                console.log('RecipientEditModal onChange called with:', updated);
                setEditingRecipient(updated);
              }}
              onSave={() => saveSection('recipient')}
              onCancel={closeModal}
              saving={saving}
            />
          )}

          {activeModal === 'delivery' && (
            <DeliveryEditModal
              delivery={editingDelivery || {
                deliveryDate: '',
                deliveryTime: '',
                cardMessage: '',
                specialInstructions: '',
                occasion: '',
                deliveryFee: 0
              }}
              onChange={setEditingDelivery}
              onSave={() => saveSection('delivery')}
              onCancel={closeModal}
              saving={saving}
            />
          )}

          {activeModal === 'products' && (
            <ProductsEditModal
              products={editingProducts}
              onChange={setEditingProducts}
              onSave={() => saveSection('products')}
              onCancel={closeModal}
              saving={saving}
            />
          )}

          {activeModal === 'payment' && (
            <PaymentEditModal
              payment={editingPayment || {
                deliveryFee: 0,
                discount: 0,
                gst: 0,
                pst: 0
              }}
              onChange={setEditingPayment}
              onSave={() => saveSection('payment')}
              onCancel={closeModal}
              saving={saving}
            />
          )}

          {activeModal === 'images' && (
            <ImagesEditModal
              images={editingImages}
              onChange={setEditingImages}
              onSave={(finalImages) => {
                if (finalImages) {
                  saveSection('images', finalImages);
                } else {
                  saveSection('images');
                }
              }}
              onCancel={closeModal}
              saving={saving}
            />
          )}
        </div>
      </Modal>

      {/* Payment Adjustment Modal */}
      {showPaymentAdjustment && paymentAdjustmentData && (
        <PaymentAdjustmentModal
          orderId={order.id}
          oldTotal={paymentAdjustmentData.oldTotal}
          newTotal={paymentAdjustmentData.newTotal}
          paymentMethods={paymentInfo?.paymentMethods || []}
          transactionId={paymentInfo?.transactionId}
          onComplete={handlePaymentAdjustmentComplete}
          onCancel={handlePaymentAdjustmentCancel}
        />
      )}

      {/* Refund Modal */}
      <RefundModal
        isOpen={refundModalOpen}
        transactionNumber={refundTransactionNumber}
        onClose={() => {
          setRefundModalOpen(false);
          setRefundTransactionNumber(null);
        }}
        onRefundComplete={handleRefundComplete}
      />

      {/* Print Options Modal */}
      <ReceiptInvoiceModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        orderId={order.id}
        orderNumber={order.orderNumber}
        mode="print"
        defaultEmail={order.customer?.email}
      />

      {/* Email Options Modal */}
      <ReceiptInvoiceModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        orderId={order.id}
        orderNumber={order.orderNumber}
        mode="email"
        defaultEmail={order.customer?.email}
      />

      <OrderCommunicationModal
        isOpen={communicationModalOpen}
        onClose={() => setCommunicationModalOpen(false)}
        order={order}
        onUnreadCountsUpdated={handleUnreadCountsUpdated}
      />
    </div>
  );
};

export default OrderEditPage;
