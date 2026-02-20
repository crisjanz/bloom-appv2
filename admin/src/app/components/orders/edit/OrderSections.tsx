import React from 'react';
import { PencilIcon, CalendarIcon, UserIcon, TruckIcon, CreditCardIcon, PhotoIcon } from '@shared/assets/icons';
import { Order } from '../types';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { useTaxRates } from '@shared/hooks/useTaxRates';
import { formatPhoneDisplay } from '@shared/ui/forms/PhoneInput';
import { formatCurrency } from '@shared/utils/currency';

interface OrderSectionsProps {
  order: Order;
  onEdit: (section: string) => void;
  /** Which column to render. 'sidebar' = Customer, Address, Delivery Details.
   *  'main' = Order Items, Photos, Payment. Defaults to 'all'. */
  column?: 'main' | 'sidebar' | 'all';
}

const OrderSections: React.FC<OrderSectionsProps> = ({ order, onEdit, column = 'all' }) => {
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const { taxRates } = useTaxRates();

  const showSidebar = column === 'sidebar' || column === 'all';
  const showMain = column === 'main' || column === 'all';

  const formatDate = (dateString: string) => {
    if (timezoneLoading) return dateString;
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatBusinessDate(date);
  };

  return (
    // [&>div:last-child]:border-b-0 ensures no trailing border regardless of which column is shown
    <div className="space-y-0 [&>div:last-child]:border-b-0">

      {/* ── SIDEBAR SECTIONS ── */}

      {/* Customer Section */}
      {showSidebar && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer</h3>
            </div>
            <button
              onClick={() => onEdit('customer')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {order.customer.firstName} {order.customer.lastName}
              </div>
            </div>
            {order.customer.email && (
              <div className="text-gray-600 dark:text-gray-400">{order.customer.email}</div>
            )}
            {order.customer.phone && (
              <div className="text-gray-600 dark:text-gray-400">{formatPhoneDisplay(order.customer.phone)}</div>
            )}
          </div>
        </div>
      )}

      {/* Recipient / Delivery Address Section */}
      {showSidebar && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {order.type === 'DELIVERY' ? 'Delivery Address' : 'Pickup'}
              </h3>
            </div>
            <button
              onClick={() => onEdit('recipient')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {order.type === 'DELIVERY' && (order.deliveryAddress || order.recipientCustomer) ? (
            <div className="space-y-2 text-sm">
              <div className="font-medium text-gray-900 dark:text-white">
                {order.deliveryAddress ? (
                  <>
                    {order.deliveryAddress.firstName} {order.deliveryAddress.lastName}
                    {order.deliveryAddress.company && (
                      <span className="text-gray-500 dark:text-gray-400"> ({order.deliveryAddress.company})</span>
                    )}
                  </>
                ) : order.recipientCustomer ? (
                  <>{order.recipientCustomer.firstName} {order.recipientCustomer.lastName}</>
                ) : order.recipientName ? (
                  <>{order.recipientName}</>
                ) : null}
              </div>
              {(order.deliveryAddress?.phone || order.recipientCustomer?.phone) && (
                <div className="text-gray-600 dark:text-gray-400">
                  {formatPhoneDisplay(order.deliveryAddress?.phone || order.recipientCustomer?.phone)}
                </div>
              )}
              {order.deliveryAddress ? (
                <div className="text-gray-600 dark:text-gray-400">
                  {order.deliveryAddress.address1}
                  {order.deliveryAddress.address2 && <>, {order.deliveryAddress.address2}</>}
                  <br />
                  {order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400">No address on file</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Customer will pick up at store
            </div>
          )}
        </div>
      )}

      {/* Delivery Details Section */}
      {showSidebar && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Delivery Details</h3>
            </div>
            <button
              onClick={() => onEdit('delivery')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Date</div>
                <div className="text-gray-900 dark:text-white">
                  {order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
                </div>
              </div>
              {order.deliveryTime && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Time</div>
                  <div className="text-gray-900 dark:text-white">{order.deliveryTime}</div>
                </div>
              )}
            </div>
            {order.occasion && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Occasion</div>
                <div className="text-gray-900 dark:text-white">{order.occasion}</div>
              </div>
            )}
            {order.cardMessage && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Card Message</div>
                <div className="text-gray-900 dark:text-white italic">"{order.cardMessage}"</div>
              </div>
            )}
            {order.specialInstructions && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Special Instructions</div>
                <div className="text-gray-900 dark:text-white">{order.specialInstructions}</div>
              </div>
            )}
            {!order.deliveryDate && !order.occasion && !order.cardMessage && !order.specialInstructions && (
              <div className="text-gray-500 dark:text-gray-400">No details added</div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN SECTIONS ── */}

      {/* Order Items Section */}
      {showMain && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Order Items</h3>
            <button
              onClick={() => onEdit('financials')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-medium text-gray-900 dark:text-white">{item.customName}</div>
                  {item.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {formatCurrency(item.rowTotal)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Photos Section */}
      {showMain && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PhotoIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Order Photos</h3>
            </div>
            <button
              onClick={() => onEdit('images')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
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
              <div className="col-span-full py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                No photos uploaded yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Summary Section */}
      {showMain && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment Summary</h3>
            </div>
            <button
              onClick={() => onEdit('financials')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(order.orderItems.reduce((sum, item) => sum + item.rowTotal, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Delivery Fee</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(order.deliveryFee)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Discount</span>
                <span className="text-gray-900 dark:text-white">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.taxBreakdown && order.taxBreakdown.length > 0 ? (
              order.taxBreakdown.map((tax: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{tax.name}</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(tax.amount)}</span>
                </div>
              ))
            ) : (
              <>
                {order.gst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">GST (5%)</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(order.gst)}</span>
                  </div>
                )}
                {order.pst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">PST (7%)</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(order.pst)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <span className="font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.paymentAmount)}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderSections;
