import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { XIcon } from '@shared/assets/icons';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import OrderHeader from '@app/components/orders/edit/OrderHeader';
import OrderSections from '@app/components/orders/edit/OrderSections';
import { Order } from '@app/components/orders/types';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
// MIGRATION: Use domain hook for order management
import { useOrderManagement } from '@domains/orders/hooks/useOrderService';

// Import all modal components
import CustomerEditModal from '@app/components/orders/edit/modals/CustomerEditModal';
import RecipientEditModal from '@app/components/orders/edit/modals/RecipientEditModal';
import DeliveryEditModal from '@app/components/orders/edit/modals/DeliveryEditModal';
import ProductsEditModal from '@app/components/orders/edit/modals/ProductsEditModal';
import PaymentEditModal from '@app/components/orders/edit/modals/PaymentEditModal';
import ImagesEditModal from '@app/components/orders/edit/modals/ImagesEditModal';
import PaymentAdjustmentModal from '@app/components/orders/edit/modals/PaymentAdjustmentModal';

interface PaymentAdjustmentResult {
  method: 'auto' | 'manual';
  paymentType: string;
  amount: number;
  success: boolean;
  notes: string;
  transactionId?: string;
}

const OrderEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getBusinessDateString } = useBusinessTimezone();
  
  // MIGRATION: Use domain hook for order management
  const { order, loading, saving, error, fetchOrder, updateOrderStatus, updateOrderField } = useOrderManagement(id);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
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
    originalPaymentMethod: string;
    originalCardLast4: string;
  } | null>(null);

  // MIGRATION: Order auto-loads via useOrderManagement hook when id changes

  // MIGRATION: Handle status change using domain hook
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateOrderStatus(newStatus);
      // Order is automatically refreshed by the domain hook
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const openModal = (modalType: string) => {
    if (!order) return;
    
    switch (modalType) {
      case 'customer':
        setEditingCustomer({ ...order.customer });
        break;
      case 'recipient':
        setEditingRecipient(order.recipient ? { ...order.recipient } : {
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
          deliveryFee: order.deliveryFee / 100
        });
        break;
      case 'products':
        setEditingProducts([...order.orderItems]);
        break;
      case 'payment':
        setEditingPayment({
          deliveryFee: order.deliveryFee / 100,
          discount: order.discount / 100,
          gst: order.gst / 100,
          pst: order.pst / 100
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
  };

  // Modified saveSection to accept direct data and handle payment adjustments
  const saveSection = async (section: string, directData?: any) => {
    try {
      // Store the old total before updating
      const oldTotal = order?.paymentAmount || 0;
      
      let updateData: any = {};
      
      switch (section) {
        case 'customer':
          updateData = { customer: editingCustomer };
          break;
        case 'recipient':
          updateData = { recipient: editingRecipient, updateDatabase: true };
          break;
        case 'delivery':
          updateData = { 
            deliveryDate: editingDelivery.deliveryDate || null,
            deliveryTime: editingDelivery.deliveryTime || null,
            cardMessage: editingDelivery.cardMessage || null,
            specialInstructions: editingDelivery.specialInstructions || null,
            occasion: editingDelivery.occasion || null,
            deliveryFee: Math.round(editingDelivery.deliveryFee * 100)
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
            deliveryFee: Math.round(editingPayment.deliveryFee * 100),
            discount: Math.round(editingPayment.discount * 100),
            gst: Math.round(editingPayment.gst * 100),
            pst: Math.round(editingPayment.pst * 100)
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

      // MIGRATION: Use domain hook for updates
      const result = await updateOrderField(section, updateData[section] || updateData);
      console.log('Update result:', result);
      
      if (result) {
        const newTotal = result.paymentAmount;
        
        // Check if payment adjustment is needed (for differences of $0.50 or more)
        if (Math.abs(newTotal - oldTotal) >= 50) {
          setPaymentAdjustmentData({
            oldTotal,
            newTotal,
            originalPaymentMethod: 'Payment Transaction',
            originalCardLast4: '1234' // TODO: Get from actual order data
          });
          setShowPaymentAdjustment(true);
        }
        
        closeModal();
        // Order is automatically refreshed by the domain hook
        console.log('Order updated successfully');
      } else {
        console.error('Update failed - result was null');
        alert('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  // Payment adjustment handlers
  const handlePaymentAdjustmentComplete = async (adjustmentData: PaymentAdjustmentResult) => {
    try {
      console.log('Payment adjustment completed:', adjustmentData);
      
      // TODO: Add API endpoint to save payment adjustment notes
      // await fetch(`/api/orders/${id}/add-note`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     note: adjustmentData.notes,
      //     type: 'payment_adjustment',
      //     employeeId: 'current-employee-id' // TODO: Get from auth
      //   })
      // });
      
      setShowPaymentAdjustment(false);
      setPaymentAdjustmentData(null);
      
      // Show success message
      alert(`Payment adjustment completed successfully!\n\n${adjustmentData.notes}`);
      
    } catch (error) {
      console.error('Error saving payment adjustment:', error);
      alert('Payment processed but failed to save notes. Please add manual note to order.');
    }
  };

  const handlePaymentAdjustmentCancel = () => {
    setShowPaymentAdjustment(false);
    setPaymentAdjustmentData(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#597485]"></div>
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
              onClick={() => fetchOrder()}
              className="mt-3 text-sm text-[#597485] hover:text-[#4e6575] underline"
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
      
      <OrderHeader 
        order={order} 
        onStatusChange={handleStatusChange}
      />

      <ComponentCard title="Order Details">
        <OrderSections 
          order={order} 
          onEdit={openModal} 
        />
      </ComponentCard>

      {/* Main Edit Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Edit {activeModal.charAt(0).toUpperCase() + activeModal.slice(1)}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              
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
                  onChange={setEditingRecipient}
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
          </div>
        </div>
      )}

      {/* Payment Adjustment Modal */}
      {showPaymentAdjustment && paymentAdjustmentData && (
        <PaymentAdjustmentModal
          oldTotal={paymentAdjustmentData.oldTotal}
          newTotal={paymentAdjustmentData.newTotal}
          originalPaymentMethod={paymentAdjustmentData.originalPaymentMethod}
          originalCardLast4={paymentAdjustmentData.originalCardLast4}
          customerName={`${order?.customer?.firstName} ${order?.customer?.lastName}`}
          onComplete={handlePaymentAdjustmentComplete}
          onCancel={handlePaymentAdjustmentCancel}
        />
      )}
    </div>
  );
};

export default OrderEditPage;
