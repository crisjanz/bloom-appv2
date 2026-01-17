import { FC, useState } from 'react';
import {
  CreditCardIcon,
  DollarLineIcon,
  DollarSignIcon,
  HomeIcon,
  BoltIcon,
  CheckLineIcon,
  SlashIcon,
  ArrowRightIcon,
} from '@shared/assets/icons';
import CashPaymentModal from '@app/components/pos/payment/CashPaymentModal';
import CardPaymentModal from '@app/components/pos/payment/CardPaymentModal';
import ManualPaymentModal from '@app/components/pos/payment/ManualPaymentModal';
import AdjustmentsModal from '@app/components/orders/payment/AdjustmentsModal';
import SplitPaymentView, { SplitPaymentRow } from '@app/components/pos/payment/SplitPaymentView';
import { formatCurrency, parseUserCurrency } from '@shared/utils/currency';

type Props = {
  total: number;
  itemTotal: number;
  gst: number;
  pst: number;
  grandTotal: number;
  totalDeliveryFee: number;
  customer?: any;
  onComplete: (paymentData: any) => void;
  onDiscountsChange?: (discounts: any) => void;
  onGiftCardChange?: (amount: number, data?: any) => void;
  couponDiscount?: number;
  giftCardDiscount?: number;
  manualDiscount?: number;
  manualDiscountType?: '$' | '%';
  isOverlay?: boolean;
};

type PaymentButton = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const TakeOrderPaymentTiles: FC<Props> = ({
  total,
  itemTotal,
  gst,
  pst,
  grandTotal,
  totalDeliveryFee,
  customer,
  onComplete,
  onDiscountsChange,
  onGiftCardChange,
  couponDiscount = 0,
  giftCardDiscount = 0,
  manualDiscount = 0,
  manualDiscountType = '$',
  isOverlay = false,
}) => {
  // Safety check for undefined values
  const safeGrandTotal = grandTotal || 0;
  const safeItemTotal = itemTotal || 0;
  const safeGst = gst || 0;
  const safePst = pst || 0;
  const safeTotalDeliveryFee = totalDeliveryFee || 0;

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Discount/adjustment state
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
  const [discountReason, setDiscountReason] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Gift card state
  const [appliedGiftCards, setAppliedGiftCards] = useState<any[]>([]);

  // Split payment state
  const [splitPaymentRows, setSplitPaymentRows] = useState<SplitPaymentRow[]>([]);
  const [splitRemaining, setSplitRemaining] = useState(safeGrandTotal);

  const basePaymentButtons: PaymentButton[] = [
    {
      id: 'card',
      label: 'Card',
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
    {
      id: 'cash',
      label: 'Cash',
      icon: <DollarSignIcon className="h-5 w-5" />,
    },
    {
      id: 'house_account',
      label: 'House Account',
      icon: <HomeIcon className="h-5 w-5" />,
    },
    {
      id: 'cod',
      label: 'COD',
      icon: <DollarLineIcon className="h-5 w-5" />,
    },
    {
      id: 'check',
      label: 'Check',
      icon: <CheckLineIcon className="h-5 w-5" />,
    },
    {
      id: 'split',
      label: 'Split',
      icon: <SlashIcon className="h-5 w-5" />,
    },
    {
      id: 'adjustments',
      label: 'Discounts / Gift Cards',
      icon: <BoltIcon className="h-5 w-5" />,
    },
  ];

  // Add "Send to POS" button when in overlay mode
  const paymentButtons: PaymentButton[] = isOverlay
    ? [
        {
          id: 'send_to_pos',
          label: 'Send to POS',
          icon: <ArrowRightIcon className="h-5 w-5" />,
        },
        ...basePaymentButtons,
      ]
    : basePaymentButtons;

  const handleButtonClick = (buttonId: string) => {
    if (buttonId === 'split') {
      handleSplitPaymentStart();
    } else if (buttonId === 'send_to_pos') {
      // Send to POS immediately triggers payment flow with special method
      onComplete({
        method: 'send_to_pos',
        amount: safeGrandTotal,
        metadata: {},
      });
    } else {
      setActiveModal(buttonId);
    }
  };

  const handleCashComplete = (paymentData: { cashReceived: number; changeDue: number }) => {
    onComplete({
      method: 'CASH',
      amount: safeGrandTotal,
      metadata: paymentData,
    });
    setActiveModal(null);
  };

  const handleCardComplete = (paymentData: any) => {
    onComplete({
      method: 'CARD',
      amount: safeGrandTotal,
      metadata: paymentData,
    });
    setActiveModal(null);
  };

  const handleManualComplete = (method: string, paymentData: any) => {
    onComplete({
      method,
      amount: safeGrandTotal,
      metadata: paymentData,
    });
    setActiveModal(null);
  };

  const handleApplyDiscount = () => {
    // Apply manual discount
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      setDiscountError('Please enter a valid discount amount');
      return;
    }
    const discountAmount =
      discountType === 'percent' ? value : parseUserCurrency(discountValue);
    onDiscountsChange?.({
      manualDiscount: discountAmount,
      manualDiscountType: discountType === 'percent' ? '%' : '$',
      discountReason,
    });
    setDiscountError(null);
  };

  const handleCouponValidation = async (code: string) => {
    setIsValidating(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const response = await fetch(`/api/coupons/validate/${code}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setIsCouponValid(true);
        setCouponSuccess(`Coupon applied: ${data.description || code}`);
      } else {
        setIsCouponValid(false);
        setCouponError(data.error || 'Invalid coupon code');
      }
    } catch (error) {
      setCouponError('Failed to validate coupon');
      setIsCouponValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApplyCoupon = () => {
    if (isCouponValid) {
      // Apply coupon discount (implementation depends on your coupon logic)
      setCouponCode('');
      setIsCouponValid(false);
      setCouponSuccess('');
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setIsCouponValid(false);
    setCouponError('');
    setCouponSuccess('');
  };

  // Split payment handlers
  const handleSplitPaymentStart = () => {
    const initialRow: SplitPaymentRow = {
      id: Date.now().toString(),
      tender: 'cash',
      amount: safeGrandTotal,
      status: 'pending',
    };
    setSplitPaymentRows([initialRow]);
    setSplitRemaining(safeGrandTotal);
    setActiveModal('split');
  };

  const handleSplitBack = () => {
    setSplitPaymentRows([]);
    setSplitRemaining(safeGrandTotal);
    setActiveModal(null);
  };

  const handleSplitChangeTender = (rowId: string, tender: any) => {
    setSplitPaymentRows(rows =>
      rows.map(row => row.id === rowId ? { ...row, tender } : row)
    );
  };

  const handleSplitChangeAmount = (rowId: string, amount: number) => {
    setSplitPaymentRows(rows => {
      const updatedRows = rows.map(row =>
        row.id === rowId ? { ...row, amount } : row
      );
      const totalPaid = updatedRows
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount, 0);
      const totalPending = updatedRows
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.amount, 0);
      setSplitRemaining(safeGrandTotal - totalPaid - totalPending);
      return updatedRows;
    });
  };

  const handleSplitPayRow = (rowId: string) => {
    setSplitPaymentRows(rows =>
      rows.map(row =>
        row.id === rowId ? { ...row, status: 'completed' as const } : row
      )
    );
  };

  const handleSplitAddRow = () => {
    const newRow: SplitPaymentRow = {
      id: Date.now().toString(),
      tender: 'cash',
      amount: Math.max(0, splitRemaining),
      status: 'pending',
    };
    setSplitPaymentRows(rows => [...rows, newRow]);
  };

  const handleSplitDeleteRow = (rowId: string) => {
    setSplitPaymentRows(rows => rows.filter(row => row.id !== rowId));
  };

  const handleSplitComplete = () => {
    const completedPayments = splitPaymentRows
      .filter(row => row.status === 'completed')
      .map(row => ({
        method: row.tender.toUpperCase(),
        amount: row.amount,
        metadata: { details: row.details },
      }));

    onComplete({
      method: 'SPLIT',
      amount: safeGrandTotal,
      metadata: { payments: completedPayments },
    });
    setActiveModal(null);
    setSplitPaymentRows([]);
  };

  // Show split payment view if active
  if (activeModal === 'split' && splitPaymentRows.length > 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <SplitPaymentView
          total={safeGrandTotal}
          rows={splitPaymentRows}
          remaining={splitRemaining}
          onBack={handleSplitBack}
          onChangeTender={handleSplitChangeTender}
          onChangeAmount={handleSplitChangeAmount}
          onPayRow={handleSplitPayRow}
          onAddRow={handleSplitAddRow}
          onDeleteRow={handleSplitDeleteRow}
        />
        {splitRemaining <= 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={handleSplitComplete}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Complete Split Payment
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment
        </h3>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Left Column - Order Summary */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Order Summary
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Items Total:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(safeItemTotal)}</span>
            </div>
            {totalDeliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Delivery Fee:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(safeTotalDeliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">GST:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(safeGst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">PST:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(safePst)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <span className="text-gray-900 dark:text-white">Total:</span>
              <span className="text-brand-600 dark:text-brand-400">{formatCurrency(safeGrandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Payment Buttons */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
            Select Payment Method
          </h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {paymentButtons.map((button) => (
              <button
                key={button.id}
                onClick={() => handleButtonClick(button.id)}
                className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 transition-all w-[140px] h-[60px] ${
                  activeModal === button.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-brand-600 dark:text-brand-400">{button.icon}</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight text-center">{button.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <>
        <CashPaymentModal
          open={activeModal === 'cash'}
          total={safeGrandTotal}
          onComplete={handleCashComplete}
          onCancel={() => setActiveModal(null)}
        />

        <CardPaymentModal
          open={activeModal === 'card'}
          total={safeGrandTotal}
          cardType="credit"
          customerEmail={customer?.email}
          customerPhone={customer?.phone}
          customerName={customer?.firstName && customer?.lastName ? `${customer.firstName} ${customer.lastName}` : ''}
          defaultMode="manual"
          onComplete={handleCardComplete}
          onCancel={() => setActiveModal(null)}
        />

        <ManualPaymentModal
          open={activeModal === 'house_account'}
          methodLabel="House Account"
          defaultAmount={safeGrandTotal}
          requireReference={true}
          referenceLabel="Account Number"
          instructions="Enter the house account details"
          onSubmit={(data) => handleManualComplete('HOUSE_ACCOUNT', data)}
          onCancel={() => setActiveModal(null)}
        />

        <ManualPaymentModal
          open={activeModal === 'cod'}
          methodLabel="Cash on Delivery"
          defaultAmount={safeGrandTotal}
          requireReference={false}
          instructions="Payment will be collected upon delivery"
          onSubmit={(data) => handleManualComplete('COD', data)}
          onCancel={() => setActiveModal(null)}
        />

        <ManualPaymentModal
          open={activeModal === 'check'}
          methodLabel="Check Payment"
          defaultAmount={safeGrandTotal}
          requireReference={true}
          referenceLabel="Check Number"
          instructions="Enter the check number"
          onSubmit={(data) => handleManualComplete('CHECK', data)}
          onCancel={() => setActiveModal(null)}
        />

        <AdjustmentsModal
          open={activeModal === 'adjustments'}
          onClose={() => setActiveModal(null)}
          discountType={discountType}
          discountValue={discountValue}
          onDiscountTypeChange={setDiscountType}
          onDiscountValueChange={setDiscountValue}
          discountReason={discountReason}
          onDiscountReasonChange={setDiscountReason}
          discountError={discountError}
          onApplyDiscount={handleApplyDiscount}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          onCouponValidation={handleCouponValidation}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          isValidating={isValidating}
          couponError={couponError}
          couponSuccess={couponSuccess}
          isCouponValid={isCouponValid}
          grandTotal={safeGrandTotal}
          onGiftCardChange={onGiftCardChange}
          appliedGiftCards={appliedGiftCards}
          onAppliedGiftCardsChange={setAppliedGiftCards}
        />
      </>
    </div>
  );
};

export default TakeOrderPaymentTiles;
