import React from 'react';
import { PencilIcon, CalendarIcon, UserIcon, TruckIcon, CreditCardIcon, PhotoIcon } from '@shared/assets/icons';
import { Order } from '../types';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { useTaxRates } from '@shared/hooks/useTaxRates';

interface OrderSectionsProps {
  order: Order;
  onEdit: (section: string) => void;
}

const OrderSections: React.FC<OrderSectionsProps> = ({ order, onEdit }) => {
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const { taxRates } = useTaxRates();
  
  // All currency is stored in cents - single formatter
  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amountInCents / 100);
  };

  const formatDate = (dateString: string) => {
    if (timezoneLoading) return dateString;
    // Extract date part first to avoid timezone conversion
    const datePart = dateString.split('T')[0];  // "2025-10-04"
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatBusinessDate(date);
  };

  return (
    <div className="space-y-8">
      {/* Customer Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Customer Information</h3>
          </div>
          <button
            onClick={() => onEdit('customer')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Name:</span>
            <div className="text-gray-900 dark:text-white">
              {order.customer.firstName} {order.customer.lastName}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email:</span>
            <div className="text-gray-900 dark:text-white">{order.customer.email}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone:</span>
            <div className="text-gray-900 dark:text-white">{order.customer.phone}</div>
          </div>
        </div>
      </div>

      {/* Recipient Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {order.type === 'DELIVERY' ? 'Delivery Address' : 'Pickup Information'}
            </h3>
          </div>
          <button
            onClick={() => onEdit('recipient')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        {order.type === 'DELIVERY' && (order.deliveryAddress || order.recipientCustomer) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Recipient:</span>
              <div className="text-gray-900 dark:text-white">
                {order.deliveryAddress ? (
                  <>
                    {order.deliveryAddress.firstName} {order.deliveryAddress.lastName}
                    {order.deliveryAddress.company && <div className="text-sm text-gray-500">({order.deliveryAddress.company})</div>}
                  </>
                ) : order.recipientCustomer ? (
                  <>
                    {order.recipientCustomer.firstName} {order.recipientCustomer.lastName}
                  </>
                ) : null}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone:</span>
              <div className="text-gray-900 dark:text-white">
                {order.deliveryAddress?.phone || order.recipientCustomer?.phone}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Address:</span>
              <div className="text-gray-900 dark:text-white">
                {order.deliveryAddress ? (
                  <>
                    {order.deliveryAddress.address1}
                    {order.deliveryAddress.address2 && <>, {order.deliveryAddress.address2}</>}
                    <br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}
                  </>
                ) : (
                  <span className="text-gray-500">No address available</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-600 dark:text-gray-400">
            Customer will pick up at store
          </div>
        )}
      </div>

      {/* Delivery Details Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delivery Details</h3>
          </div>
          <button
            onClick={() => onEdit('delivery')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Date:</span>
            <div className="text-gray-900 dark:text-white">
              {order.deliveryDate ? formatDate(order.deliveryDate) : 'Not scheduled'}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Time:</span>
            <div className="text-gray-900 dark:text-white">{order.deliveryTime || 'Not specified'}</div>
          </div>
          {order.occasion && (
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Occasion:</span>
              <div className="text-gray-900 dark:text-white">{order.occasion}</div>
            </div>
          )}
          <div className="md:col-span-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Card Message:</span>
            <div className="text-gray-900 dark:text-white">{order.cardMessage || 'None'}</div>
          </div>
          <div className="md:col-span-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Special Instructions:</span>
            <div className="text-gray-900 dark:text-white">{order.specialInstructions || 'None'}</div>
          </div>
        </div>
      </div>

      {/* Order Items Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Order Items</h3>
          <button
            onClick={() => onEdit('products')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {order.orderItems.map((item, index) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{item.customName}</div>
                {item.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">{item.description}</div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                </div>
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.rowTotal)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Images Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Order Photos</h3>
          </div>
          <button
            onClick={() => onEdit('images')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {order.images && order.images.length > 0 ? (
            order.images.map((image, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src={image} 
                  alt={`Order photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No photos uploaded yet
            </div>
          )}
        </div>
      </div>

      {/* Payment Summary Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment Summary</h3>
          </div>
          <button
            onClick={() => onEdit('payment')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal:</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(order.orderItems.reduce((sum, item) => sum + item.rowTotal, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Delivery Fee:</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Discount:</span>
              <span className="text-gray-900 dark:text-white">-{formatCurrency(order.discount)}</span>
            </div>
            {/* Dynamic Tax Breakdown */}
            {order.taxBreakdown && order.taxBreakdown.length > 0 ? (
              // New dynamic tax system
              order.taxBreakdown.map((tax: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{tax.name}:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(tax.amount)}</span>
                </div>
              ))
            ) : (
              // Fallback to legacy tax fields for backward compatibility
              <>
                {order.gst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">GST (5%):</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(order.gst)}</span>
                  </div>
                )}
                {order.pst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">PST (7%):</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(order.pst)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="font-medium text-gray-900 dark:text-white">Total:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(order.paymentAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSections;
