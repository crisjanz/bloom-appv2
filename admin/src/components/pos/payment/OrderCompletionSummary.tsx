// components/pos/payment/OrderCompletionSummary.tsx
import { FC } from "react";
import { 
  CheckCircleIcon, 
  DocsIcon, 
  MailIcon,
  ArrowUpIcon,
  PlusIcon 
} from "../../../icons";

type PaymentMethod = {
  method: string;
  amount: number;
};

type CompletedOrder = {
  id: string;
  type: 'delivery' | 'pos';
  customerName?: string;
  total: number;
};

type GiftCard = {
  cardNumber: string;
  amount: number;
  type: 'PHYSICAL' | 'DIGITAL';
  recipientEmail?: string;
  recipientName?: string;
};

type Props = {
  transactionId: string;
  transactionNumber?: string; // PT-XXXX number
  totalAmount: number;
  paymentMethods: PaymentMethod[];
  completedOrders: CompletedOrder[];
  giftCards?: GiftCard[]; // Optional gift cards created
  onSendReceipt: () => void;
  onPrintReceipt: () => void;
  onProcessRefund: () => void;
  onNewOrder: () => void;
};

const OrderCompletionSummary: FC<Props> = ({
  transactionId,
  transactionNumber,
  totalAmount,
  paymentMethods,
  completedOrders,
  giftCards = [],
  onSendReceipt,
  onPrintReceipt,
  onProcessRefund,
  onNewOrder,
}) => {
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'credit': return 'Credit Card';
      case 'debit': return 'Debit Card';
      case 'gift_card': return 'Gift Card';
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  return (
<div className="p-6 space-y-6 max-h-[90vh] overflow-y-auto pos-scrollbar">
      
      {/* Compact Success Header */}
      <div className="text-center space-y-2 py-3">
        <div className="flex justify-center">
          <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-black dark:text-white">
          Transaction Complete!
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Transaction: <span className="font-mono font-semibold text-[#597485]">{transactionNumber || transactionId}</span>
        </p>
      </div>

      {/* Compact Transaction Summary */}
      <div className="bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium text-black dark:text-white">Total:</span>
          <span className="text-xl font-bold text-[#597485]">${totalAmount.toFixed(2)}</span>
        </div>

        {/* Compact Payment Methods */}
        <div className="space-y-1">
          {paymentMethods.map((payment, index) => (
            <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {formatPaymentMethod(payment.method)}
              </span>
              <span className="font-semibold text-black dark:text-white">
                ${payment.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Compact Orders */}
      <div className="bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark p-4">
        <h3 className="font-semibold text-black dark:text-white mb-2 text-sm">Orders Created</h3>
        <div className="space-y-1">
          {completedOrders.map((order, index) => (
            <div key={index} className="flex justify-between items-center py-1 text-sm">
              <div>
                <div className="font-medium text-black dark:text-white">#{order.id}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {order.type === 'delivery' ? `→ ${order.customerName}` : 'POS Items'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-black dark:text-white">${order.total.toFixed(2)}</div>
                <div className="text-xs text-green-600 dark:text-green-400">PAID</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gift Cards Section (if any) */}
      {giftCards.length > 0 && (
        <div className="bg-white dark:bg-boxdark rounded-lg border border-stroke dark:border-strokedark p-4">
          <h3 className="font-semibold text-black dark:text-white mb-2 text-sm">Gift Cards Created</h3>
          <div className="space-y-2">
            {giftCards.map((card, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded text-sm border border-green-200 dark:border-green-800">
                <div>
                  <div className="font-mono font-medium text-black dark:text-white">{card.cardNumber}</div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    {card.type} • {card.recipientName || 'Walk-in Customer'}
                    {card.recipientEmail && ` • ${card.recipientEmail}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-800 dark:text-green-200">${card.amount.toFixed(2)}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">ACTIVE</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact Action Buttons */}
{/* Card-style Action Buttons */}
<div className="grid grid-cols-4 gap-3">
  <button
    onClick={onSendReceipt}
    className="relative h-20 flex flex-col justify-center items-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-boxdark hover:border-[#597485] hover:shadow-lg transition-all text-gray-800 dark:text-white"
  >
    <MailIcon className="w-6 h-6 text-[#597485] mb-1" />
    <span className="text-xs font-medium">Send Receipt</span>
    
    {/* Selection indicator circle */}
    <div className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-gray-400 bg-transparent" />
  </button>

  <button
    onClick={onPrintReceipt}
    className="relative h-20 flex flex-col justify-center items-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-boxdark hover:border-gray-500 hover:shadow-lg transition-all text-gray-800 dark:text-white"
  >
    <DocsIcon className="w-6 h-6 text-gray-600 mb-1" />
    <span className="text-xs font-medium">Print Receipt</span>
    
    {/* Selection indicator circle */}
    <div className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-gray-400 bg-transparent" />
  </button>

  <button
    onClick={onProcessRefund}
    className="relative h-20 flex flex-col justify-center items-center rounded-xl border-2 border-red-200 dark:border-gray-700 bg-white dark:bg-boxdark hover:border-red-500 hover:shadow-lg transition-all text-gray-800 dark:text-white"
  >
    <ArrowUpIcon className="w-6 h-6 text-red-600 mb-1" />
    <span className="text-xs font-medium">Process Refund</span>
    
    {/* Selection indicator circle */}
    <div className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-gray-400 bg-transparent" />
  </button>

  <button
    onClick={onNewOrder}
    className="relative h-20 flex flex-col justify-center items-center rounded-xl border-2 border-[#597485] bg-[#597485] hover:bg-[#4e6575] hover:shadow-lg transition-all text-white"
  >
    <PlusIcon className="w-6 h-6 text-white mb-1" />
    <span className="text-xs font-medium">New Order</span>
    
    {/* Selection indicator circle - filled for primary action */}
    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white border-2 border-white">
      <div className="w-2 h-2 rounded-full bg-[#597485] mx-auto mt-0.5" />
    </div>
  </button>
</div>

      {/* Compact Quick Stats */}
      <div className="grid grid-cols-3 gap-3 text-center py-2">
        <div>
          <div className="text-lg font-bold text-[#597485]">{completedOrders.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Orders</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#597485]">{paymentMethods.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Methods</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#597485]">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Time</div>
        </div>
      </div>

    </div>
  );
};

export default OrderCompletionSummary;