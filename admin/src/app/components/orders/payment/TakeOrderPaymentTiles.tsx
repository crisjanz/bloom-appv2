import { FC, useEffect, useState } from 'react';
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
import { generatePaymentSummary } from '@shared/utils/paymentHelpers';

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
  disabled?: boolean;
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
  const [splitRowPayments, setSplitRowPayments] = useState<Record<string, { method: string; amount: number; metadata?: Record<string, any> }>>({});
  const [splitRowInPayment, setSplitRowInPayment] = useState<{ rowId: string; amount: number } | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const houseAccountEnabled = Boolean(customer?.isHouseAccount);

  useEffect(() => {
    const plannedTotal = splitPaymentRows.reduce((sum, row) => sum + Math.max(0, Math.round(row.amount || 0)), 0);
    setSplitRemaining(Math.max(0, safeGrandTotal - plannedTotal));
  }, [splitPaymentRows, safeGrandTotal]);

  const activeModalAmount = splitRowInPayment?.amount ?? safeGrandTotal;

  const normalizeSplitMethodForSummary = (method: string): 'cash' | 'credit' | 'house_account' | 'cod' | 'check' => {
    if (method === 'CARD_STRIPE' || method === 'CARD') return 'credit';
    if (method === 'HOUSE_ACCOUNT') return 'house_account';
    if (method === 'COD' || method === 'PAY_LATER') return 'cod';
    if (method === 'CHECK') return 'check';
    return 'cash';
  };

  const finalizeSplitRowPayment = (
    method: string,
    metadata?: Record<string, any>,
    detailOverride?: string
  ) => {
    if (!splitRowInPayment) return false;

    const rowPayment = {
      method,
      amount: splitRowInPayment.amount,
      metadata
    };

    const details =
      detailOverride ||
      generatePaymentSummary({
        method: normalizeSplitMethodForSummary(method),
        amount: rowPayment.amount,
        metadata: rowPayment.metadata
      });

    setSplitRowPayments((prev) => ({
      ...prev,
      [splitRowInPayment.rowId]: rowPayment
    }));

    setSplitPaymentRows((rows) =>
      rows.map((row) =>
        row.id === splitRowInPayment.rowId
          ? {
              ...row,
              status: 'completed',
              details
            }
          : row
      )
    );

    setSplitRowInPayment(null);
    setActiveModal(null);
    setSplitError(null);
    return true;
  };

  const handleModalCancel = () => {
    if (splitRowInPayment) {
      setSplitPaymentRows((rows) =>
        rows.map((row) =>
          row.id === splitRowInPayment.rowId
            ? {
                ...row,
                status: 'pending'
              }
            : row
        )
      );
      setSplitRowInPayment(null);
    }

    setActiveModal(null);
  };

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
      disabled: !houseAccountEnabled,
    },
    {
      id: 'cod',
      label: 'Pay Later',
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
    if (buttonId === 'house_account' && !houseAccountEnabled) {
      setPaymentMethodError('House Account is only available for customers with an active house account.');
      return;
    }

    setPaymentMethodError(null);

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
    if (
      finalizeSplitRowPayment('CASH', {
        cashReceived: paymentData.cashReceived,
        changeDue: paymentData.changeDue
      })
    ) {
      return;
    }

    onComplete({
      method: 'CASH',
      amount: safeGrandTotal,
      metadata: paymentData,
    });
    handleModalCancel();
  };

  const handleCardComplete = (paymentData: any) => {
    if (
      finalizeSplitRowPayment(
        'CARD_STRIPE',
        {
          provider: 'stripe',
          transactionId: paymentData.transactionId,
          paymentIntentId: paymentData.paymentIntentId,
          cardLast4: paymentData.cardLast4,
          cardBrand: paymentData.cardBrand,
          cardFingerprint: paymentData.cardFingerprint
        },
        paymentData.transactionId ? `Stripe • ${paymentData.transactionId}` : undefined
      )
    ) {
      return;
    }

    onComplete({
      method: 'CARD',
      amount: safeGrandTotal,
      metadata: paymentData,
    });
    handleModalCancel();
  };

  const handleManualComplete = (method: string, paymentData: any) => {
    if (finalizeSplitRowPayment(method, paymentData)) {
      return;
    }

    onComplete({
      method,
      amount: safeGrandTotal,
      metadata: paymentData,
    });
    handleModalCancel();
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
    setSplitRowPayments({});
    setSplitRowInPayment(null);
    setSplitError(null);
    setActiveModal('split');
  };

  const handleSplitBack = () => {
    setSplitPaymentRows([]);
    setSplitRemaining(safeGrandTotal);
    setSplitRowPayments({});
    setSplitRowInPayment(null);
    setSplitError(null);
    setActiveModal(null);
  };

  const handleSplitChangeTender = (rowId: string, tender: any) => {
    if (tender === 'house_account' && !houseAccountEnabled) {
      setSplitError('House Account is only available for customers with an active house account.');
      return;
    }

    setSplitPaymentRows(rows =>
      rows.map(row => row.id === rowId ? { ...row, tender } : row)
    );
    setSplitError(null);
  };

  const handleSplitChangeAmount = (rowId: string, amount: number) => {
    setSplitPaymentRows(rows => {
      return rows.map(row =>
        row.id === rowId ? { ...row, amount: Math.max(0, Math.round(amount)) } : row
      );
    });
    setSplitError(null);
  };

  const handleSplitPayRow = (rowId: string) => {
    const row = splitPaymentRows.find((item) => item.id === rowId);
    if (!row || row.status !== 'pending') return;

    if (row.tender === 'house_account' && !houseAccountEnabled) {
      setSplitError('House Account is only available for customers with an active house account.');
      return;
    }

    if (row.amount <= 0) {
      setSplitError('Enter an amount for this row before charging.');
      return;
    }

    const modalType = row.tender === 'card_stripe' ? 'card' : row.tender;
    setSplitPaymentRows((rows) =>
      rows.map((item) =>
        item.id === rowId ? { ...item, status: 'processing' } : item
      )
    );
    setSplitRowInPayment({ rowId, amount: row.amount });
    setSplitError(null);
    setActiveModal(modalType);
  };

  const handleSplitAddRow = () => {
    setSplitPaymentRows((rows) => {
      const plannedTotal = rows.reduce((sum, row) => sum + Math.max(0, Math.round(row.amount || 0)), 0);
      const newRow: SplitPaymentRow = {
        id: Date.now().toString(),
        tender: 'cash',
        amount: Math.max(0, safeGrandTotal - plannedTotal),
        status: 'pending',
      };
      return [...rows, newRow];
    });
    setSplitError(null);
  };

  const handleSplitDeleteRow = (rowId: string) => {
    setSplitPaymentRows(rows => rows.filter(row => row.id !== rowId));
    setSplitRowPayments((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    if (splitRowInPayment?.rowId === rowId) {
      setSplitRowInPayment(null);
    }
    setSplitError(null);
  };

  const handleSplitComplete = () => {
    const completedRows = splitPaymentRows.filter(row => row.status === 'completed');
    const completedPayments = completedRows
      .map((row) => splitRowPayments[row.id])
      .filter((payment): payment is { method: string; amount: number; metadata?: Record<string, any> } => Boolean(payment));

    if (!completedRows.length) {
      setSplitError('Capture at least one payment before completing.');
      return;
    }

    if (completedPayments.length !== completedRows.length) {
      setSplitError('One or more completed rows are missing payment details. Please retry those rows.');
      return;
    }

    onComplete({
      method: 'SPLIT',
      amount: safeGrandTotal,
      metadata: { payments: completedPayments },
    });
    setSplitRowPayments({});
    setSplitRowInPayment(null);
    setSplitError(null);
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
        {splitError && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800">
            {splitError}
          </div>
        )}
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
                  disabled={button.disabled}
                  className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 transition-all w-[140px] h-[60px] ${
                  button.disabled
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                    : activeModal === button.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                  title={button.disabled ? 'House account is not enabled for this customer' : undefined}
                >
                  <span className="text-brand-600 dark:text-brand-400">{button.icon}</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white leading-tight text-center">{button.label}</span>
                </button>
              ))}
            </div>
            {paymentMethodError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {paymentMethodError}
              </div>
            )}
          </div>
        </div>

      {/* Modals */}
      <>
        <CashPaymentModal
          open={activeModal === 'cash'}
          total={activeModalAmount}
          onComplete={handleCashComplete}
          onCancel={handleModalCancel}
        />

        <CardPaymentModal
          open={activeModal === 'card'}
          total={activeModalAmount}
          cardType="credit"
          bloomCustomerId={customer?.id}
          customerEmail={customer?.email}
          customerPhone={customer?.phone}
          customerName={customer?.firstName && customer?.lastName ? `${customer.firstName} ${customer.lastName}` : ''}
          defaultMode="manual"
          onComplete={handleCardComplete}
          onCancel={handleModalCancel}
        />

        <ManualPaymentModal
          open={activeModal === 'house_account'}
          methodLabel="House Account"
          defaultAmount={activeModalAmount}
          requireReference={true}
          referenceLabel="Person Ordered"
          instructions="Enter who placed the order"
          onSubmit={(data) => handleManualComplete('HOUSE_ACCOUNT', data)}
          onCancel={handleModalCancel}
        />

        <ManualPaymentModal
          open={activeModal === 'cod'}
          methodLabel="Pay Later"
          defaultAmount={activeModalAmount}
          requireReference={false}
          instructions="Payment will be collected later."
          onSubmit={(data) => handleManualComplete('PAY_LATER', data)}
          onCancel={handleModalCancel}
        />

        <ManualPaymentModal
          open={activeModal === 'check'}
          methodLabel="Check Payment"
          defaultAmount={activeModalAmount}
          requireReference={true}
          referenceLabel="Check Number"
          instructions="Enter the check number"
          onSubmit={(data) => handleManualComplete('CHECK', data)}
          onCancel={handleModalCancel}
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
