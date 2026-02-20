// components/orders/edit/OrderHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import StatusSelect from '@shared/ui/forms/StatusSelect';
import { Order } from '../types';
import { getPaymentStatusDisplayText, getStatusOptions } from '@shared/utils/orderStatusHelpers';
import { getPaymentStatusColor } from '@shared/utils/statusColors';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { PhoneIcon, ChevronDownIcon, PrinterIcon, EnvelopeIcon } from '@shared/assets/icons';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';

interface OrderHeaderProps {
  order: Order;
  onStatusChange: (status: string) => void;
  onCancelRefund?: () => void;
  onPrintOptions?: () => void;
  onEmailOptions?: () => void;
  onContact?: () => void;
  unreadCount?: number;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onStatusChange,
  onCancelRefund,
  onPrintOptions,
  onEmailOptions,
  onContact,
  unreadCount
}) => {
  const statusOptions = getStatusOptions(order.type);
  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();
  const orderNumberPrefix = useOrderNumberPrefix();
  const showUnreadBadge = typeof unreadCount === 'number' && unreadCount > 0;
  const unreadLabel = showUnreadBadge ? (unreadCount > 9 ? '9+' : `${unreadCount}`) : '';
  const paymentStatus = order.paymentStatus || 'UNPAID';
  const paymentStatusLabel = getPaymentStatusDisplayText(paymentStatus);
  const paymentStatusColor = getPaymentStatusColor(paymentStatus);
  const hasRefundedPayment = paymentStatus === 'REFUNDED' || paymentStatus === 'PARTIALLY_REFUNDED';

  const canCancelRefund = onCancelRefund && !['CANCELLED', 'COMPLETED'].includes(order.status) && !hasRefundedPayment;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  const formatOrderSource = (source: string) => {
    const sourceMap: Record<string, string> = {
      'PHONE': 'Phone Order',
      'WALKIN': 'Walk-in Order',
      'EXTERNAL': 'External Order',
      'WEBSITE': 'Website Order',
      'POS': 'POS Order'
    };
    return sourceMap[source] || source;
  };

  const hasMoreItems = onPrintOptions || onEmailOptions || canCancelRefund;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* Left: order identity */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Order #{formatOrderNumber(order.orderNumber, orderNumberPrefix)}
            </h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColor}`}>
              <span className="text-sm leading-none">•</span>
              {paymentStatusLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {order.orderSource ? `${formatOrderSource(order.orderSource)} · ` : ''}
            Created {timezoneLoading ? '...' : formatDate(new Date(order.createdAt))}
          </p>
        </div>

        {/* Right: actions + status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Contact — primary */}
          {onContact && (
            <button
              type="button"
              onClick={onContact}
              className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Contact
              {showUnreadBadge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {unreadLabel}
                </span>
              )}
            </button>
          )}

          {/* More dropdown */}
          {hasMoreItems && (
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                More
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                  {onPrintOptions && (
                    <button
                      type="button"
                      onClick={() => { onPrintOptions(); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <PrinterIcon className="w-4 h-4 text-gray-400" />
                      Print
                    </button>
                  )}
                  {onEmailOptions && (
                    <button
                      type="button"
                      onClick={() => { onEmailOptions(); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      Email
                    </button>
                  )}
                  {canCancelRefund && (
                    <>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                      <button
                        type="button"
                        onClick={() => { onCancelRefund!(); setMoreOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Cancel / Refund
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status select */}
          <StatusSelect
            options={statusOptions}
            value={order.status}
            onChange={onStatusChange}
            orderType={order.type}
            placeholder="Change Status"
          />
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;
