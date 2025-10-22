import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import CashPaymentModal from './CashPaymentModal';
import CardPaymentModal from './CardPaymentModal';
import ManualPaymentModal from './ManualPaymentModal';
import SplitPaymentView, {
  SplitPaymentRow,
  SplitPaymentTender,
} from './SplitPaymentView';
import NotificationModal from './NotificationModal';
import OrderCompletionSummary from './OrderCompletionSummary';
import GiftCardActivationModal from '../../orders/payment/GiftCardActivationModal';
import GiftCardHandoffModal from '../../orders/payment/GiftCardHandoffModal';
import GiftCardInput from '../../orders/payment/GiftCardInput';
import CouponInput from '../../orders/payment/CouponInput';
import { orderContainsGiftCards } from '@shared/utils/giftCardHelpers';
import { useCouponValidation } from '@shared/hooks/useCouponValidation';
import InputField from '@shared/ui/forms/input/InputField';
import { formatCurrency } from '@shared/utils/currencyHelpers';
import { mapPaymentMethodType, getPaymentProvider, transformCartToOrders, generatePaymentSummary } from '@shared/utils/paymentHelpers';
import { getOrCreateGuestCustomer, getCustomerDisplayName } from '@shared/utils/customerHelpers';
import { usePaymentState } from '@domains/payments/hooks/usePaymentState';
import { usePaymentModals } from '@domains/payments/hooks/usePaymentModals';
import { usePaymentDiscounts } from '@domains/payments/hooks/usePaymentDiscounts';
import { useSplitPayment } from '@domains/payments/hooks/useSplitPayment';
import { useTransactionSubmission } from '@domains/payments/hooks/useTransactionSubmission';
import {
  BoltIcon,
  CreditCardIcon,
  DocsIcon,
  DollarLineIcon,
  DollarSignIcon,
  HomeIcon,
  TruckIcon,
} from '@shared/assets/icons';

type Props = {
  open: boolean;
  total: number;
  cartItems?: any[];
  customer?: any;
  customerName?: string;
  orderIds?: string[];
  employeeId?: string;
  taxAmount?: number;
  tipAmount?: number;
  onComplete: (transactionData?: any) => void;
  onCancel: () => void;
  appliedDiscounts?: Array<{ type: string; amount: number; description: string }>;
  onDiscountsChange?: (discounts: Array<{ type: string; amount: number; description: string }>) => void;
  onGiftCardChange?: (amount: number) => void;
  onCouponChange?: (amount: number, name?: string) => void;
};

type QuickActionsState = {
  emailReceipt: boolean;
  printReceipt: boolean;
};

type CompletionData = {
  transactionNumber: string;
  transactionId: string;
  totalAmount: number;
  paymentMethods: Array<{ method: string; amount: number; details?: any }>;
  completedOrders: Array<{
    id: string;
    type: 'delivery' | 'pos';
    customerName?: string;
    total: number;
  }>;
};

type PaymentTileId =
  | 'cash'
  | 'card_square'
  | 'card_stripe'
  | 'house_account'
  | 'cod'
  | 'check'
  | 'split'
  | 'discounts';

type PaymentPayload = {
  method: string;
  amount: number;
  metadata?: Record<string, any>;
};

type ModalContext =
  | null
  | {
      mode: 'single';
      tender: PaymentTileId;
      amount: number;
    }
  | {
      mode: 'split';
      tender: PaymentTileId;
      amount: number;
      rowId: string;
    };

type PaymentTile = {
  id: PaymentTileId;
  label: string;
  description: string;
  icon: ReactNode;
};

const iconWrapperClass = 'h-7 w-7 text-[#597485]';

const PAYMENT_TILES: PaymentTile[] = [
  {
    id: 'cash',
    label: 'Cash',
    description: 'Count tender & auto-calc change',
    icon: <DollarLineIcon className={iconWrapperClass} />,
  },
  {
    id: 'card_square',
    label: 'Square Card',
    description: 'Tap, dip, or swipe on the Square reader',
    icon: <CreditCardIcon className={iconWrapperClass} />,
  },
  {
    id: 'card_stripe',
    label: 'Stripe Card',
    description: 'Charge via Stripe terminal or manual entry',
    icon: <CreditCardIcon className={iconWrapperClass} />,
  },
  {
    id: 'house_account',
    label: 'House Account',
    description: 'Post this sale to the customer’s account',
    icon: <HomeIcon className={iconWrapperClass} />,
  },
  {
    id: 'cod',
    label: 'COD',
    description: 'Collect payment when the order is delivered',
    icon: <TruckIcon className={iconWrapperClass} />,
  },
  {
    id: 'check',
    label: 'Check',
    description: 'Record check details for reconciliation',
    icon: <DocsIcon className={iconWrapperClass} />,
  },
  {
    id: 'split',
    label: 'Split',
    description: 'Layer multiple tenders across rows',
    icon: <BoltIcon className={iconWrapperClass} />,
  },
  {
    id: 'discounts',
    label: 'Discounts',
    description: 'Apply manual discounts, gift cards, or coupons',
    icon: <DollarSignIcon className={iconWrapperClass} />,
  },
];

const MANUAL_METHOD_CONFIG: Record<
  'house_account' | 'cod' | 'check',
  {
    label: string;
    referenceLabel: string;
    instructions?: string;
    requireReference?: boolean;
  }
> = {
  house_account: {
    label: 'House Account',
    referenceLabel: 'Account Reference',
    instructions: 'Attach this charge to the customer’s account record.',
    requireReference: true,
  },
  cod: {
    label: 'Cash on Delivery',
    referenceLabel: 'Delivery Notes',
    instructions: 'Leave guidance for the driver when collecting payment on delivery.',
    requireReference: false,
  },
  check: {
    label: 'Check',
    referenceLabel: 'Check Number',
    instructions: 'Record the check number for bookkeeping.',
    requireReference: true,
  },
};

const MIN_BALANCE = 0.01;

const PaymentController: FC<Props> = ({
  open,
  total,
  cartItems = [],
  customer,
  customerName,
  orderIds = [],
  employeeId,
  taxAmount = 0,
  tipAmount = 0,
  onComplete,
  onCancel,
  appliedDiscounts = [],
  onDiscountsChange,
  onGiftCardChange,
  onCouponChange,
}) => {
  const [view, setView] = useState<'selection' | 'split'>('selection');

  // Use extracted hooks
  const paymentState = usePaymentState();
  const paymentModals = usePaymentModals();
  const paymentDiscounts = usePaymentDiscounts(appliedDiscounts, onDiscountsChange, onGiftCardChange, onCouponChange);
  const splitPayment = useSplitPayment(total);
  const transactionSubmission = useTransactionSubmission();

  // Coupon validation hook
  const {
    validateCoupon,
    clearValidation,
    isValidating,
    validationResult,
    isValid: isCouponValid,
    discountAmount: validatedDiscountAmount,
  } = useCouponValidation();

  // Computed values
  const customerDisplayName = getCustomerDisplayName(customer, customerName);
  const hasGiftCards = useMemo(() => orderContainsGiftCards(cartItems), [cartItems]);

  // Reset all state
  const resetState = () => {
    setView('selection');
    paymentState.resetPaymentState();
    paymentModals.resetModals();
    paymentDiscounts.resetDiscounts();
    splitPayment.resetSplitPayment();
    transactionSubmission.resetTransaction();
    clearValidation();
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  // Split payment functions are now in splitPayment hook

  const handleApplyManualDiscount = () => {
    const success = paymentDiscounts.applyManualDiscount(total);
    if (success) {
      paymentModals.setShowAdjustments(false);
    }
  };

  const handleCouponValidation = async (code: string) => {
    const trimmed = code.trim();
    paymentDiscounts.setCouponError('');
    paymentDiscounts.setCouponSuccess('');
    if (!trimmed) {
      clearValidation();
      return;
    }

    const productIds = cartItems
      .map((item) => item.productId ?? item.id)
      .filter(Boolean);
    const categoryIds = cartItems
      .map((item) => item.categoryId)
      .filter(Boolean);

    const result = await validateCoupon(trimmed, total, {
      customerId: customer?.id,
      productIds,
      categoryIds,
      source: 'POS',
    });

    if (result?.valid) {
      paymentDiscounts.setCouponSuccess(
        `Ready to apply ${result.coupon?.name || trimmed} for ${formatCurrency(
          result.discountAmount ?? 0,
        )}`,
      );
      paymentDiscounts.setCouponError('');
    } else {
      paymentDiscounts.setCouponError(result?.error || 'Coupon is not valid for this order.');
      paymentDiscounts.setCouponSuccess('');
    }
  };

  const handleApplyCoupon = async () => {
    if (!paymentDiscounts.couponCode.trim()) {
      paymentDiscounts.setCouponError('Enter a coupon code first.');
      return;
    }

    if (!validationResult || !validationResult.valid) {
      await handleCouponValidation(paymentDiscounts.couponCode.trim());
    }

    if (!validationResult || !validationResult.valid || !validatedDiscountAmount) {
      paymentDiscounts.setCouponError(validationResult?.error || 'Coupon is not valid for this order.');
      paymentDiscounts.setCouponSuccess('');
      return;
    }

    paymentDiscounts.applyCoupon(validationResult.coupon?.name, validatedDiscountAmount);
    paymentModals.setShowAdjustments(false);
  };

  const handleTileClick = (tileId: PaymentTileId) => {
    if (paymentState.isProcessing) return;
    paymentState.setPaymentError(null);

    if (tileId === 'discounts') {
      paymentModals.setShowAdjustments(true);
      return;
    }

    if (tileId === 'split') {
      splitPayment.initializeSplitPayment();
      setView('split');
      return;
    }

    if (total <= MIN_BALANCE) {
      paymentState.setPaymentError('Balance has been covered. Adjust discounts or split to proceed.');
      return;
    }

    paymentModals.openModal(tileId, Number(total.toFixed(2)));
  };

  const handleModalCancel = () => {
    if (paymentModals.modalContext?.mode === 'split' && paymentModals.modalContext.rowId) {
      splitPayment.cancelRowPayment(paymentModals.modalContext.rowId);
    }
    paymentModals.closeModal();
  };

  // normalizePayments is now in paymentHelpers

  const attemptFinalize = (payments: PaymentPayload[]) => {
    transactionSubmission.attemptFinalize(
      payments,
      total,
      hasGiftCards,
      () => paymentModals.setShowGiftCardActivation(true),
      (normalized) => void submitTransaction(normalized)
    );
  };

  const submitTransaction = async (payments: PaymentPayload[]) => {
    if (paymentState.isProcessing) return;
    paymentState.setProcessing(true);
    paymentState.setPaymentError(null);
    paymentModals.closeModal();

    try {
      const result = await transactionSubmission.submitTransaction({
        payments,
        total,
        customer,
        customerDisplayName,
        employeeId,
        taxAmount,
        tipAmount,
        orderIds,
        cartItems,
        giftCardRedemptions: paymentDiscounts.giftCardRedemptions,
        hasGiftCards,
      });

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      const { transaction, activatedGiftCards } = result.data;

      if (activatedGiftCards && activatedGiftCards.length > 0) {
        paymentModals.setShowGiftCardHandoff(true);
      }

      const completion: CompletionData = {
        transactionNumber: transaction.transactionNumber,
        transactionId: transaction.id,
        totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
        paymentMethods: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          details: payment.metadata,
        })),
        completedOrders: transformCartToOrders(cartItems, customerDisplayName),
      };

      paymentState.completePayment(completion, payments);
      paymentModals.setShowAdjustments(false);
      transactionSubmission.setPendingFinalization(null);
      setView('selection');

      if (paymentState.quickActions.emailReceipt) {
        paymentModals.setShowNotificationModal(true);
      }
      if (paymentState.quickActions.printReceipt) {
        console.log('🖨️ Print receipt for', transaction.transactionNumber);
      }

      onComplete({
        transactionNumber: transaction.transactionNumber,
        transactionId: transaction.id,
        totalAmount: completion.totalAmount,
        customerId: customer?.id,
        orderIds,
      });
    } catch (processingError) {
      console.error('Payment processing failed:', processingError);
      paymentState.setPaymentError(
        processingError instanceof Error ? processingError.message : 'Payment processing failed',
      );
    } finally {
      paymentState.setProcessing(false);
      paymentModals.closeModal();
      transactionSubmission.setPendingFinalization(null);
    }
  };

  const finalizeFromModal = (payload: PaymentPayload, rowNote?: string) => {
    if (!paymentModals.modalContext) return;

    if (paymentModals.modalContext.mode === 'split' && paymentModals.modalContext.rowId) {
      const amount = Number(paymentModals.modalContext.amount.toFixed(2));
      const payment: PaymentPayload = { ...payload, amount };
      const details = rowNote ?? generatePaymentSummary(payment);
      splitPayment.completeRowPayment(paymentModals.modalContext.rowId, payment, details);
      paymentModals.closeModal();
      return;
    }

    const amount = Number(paymentModals.modalContext.amount.toFixed(2));
    const singlePayment: PaymentPayload = { ...payload, amount };
    attemptFinalize([singlePayment]);
  };

  const handleCashComplete = (data: { cashReceived: number; changeDue: number }) => {
    if (!paymentModals.modalContext) return;
    finalizeFromModal(
      {
        method: 'cash',
        amount: paymentModals.modalContext.amount,
        metadata: {
          cashReceived: data.cashReceived,
          changeDue: data.changeDue,
        },
      },
    );
  };

  const handleCardComplete = (data: {
    method: string;
    provider: 'stripe' | 'square';
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
  }) => {
    if (!paymentModals.modalContext) return;
    finalizeFromModal(
      {
        method: 'credit',
        amount: paymentModals.modalContext.amount,
        metadata: {
          provider: data.provider,
          transactionId: data.transactionId,
          paymentIntentId: data.paymentIntentId,
          cardLast4: data.cardLast4,
          cardBrand: data.cardBrand,
        },
      },
      `${data.provider === 'stripe' ? 'Stripe' : 'Square'} ${data.transactionId ? `• ${data.transactionId}` : ''}`,
    );
  };

  const handleManualComplete = (method: 'house_account' | 'cod' | 'check', data: { reference?: string }) => {
    if (!paymentModals.modalContext) return;
    finalizeFromModal(
      {
        method,
        amount: paymentModals.modalContext.amount,
        metadata: {
          reference: data.reference,
        },
      },
    );
  };

  const handleGiftCardActivationComplete = (cards: any[]) => {
    transactionSubmission.handleGiftCardActivationComplete(cards, (normalized) => void submitTransaction(normalized));
    paymentModals.setShowGiftCardActivation(false);
  };

  const handleNotificationSuccess = (message: string) => {
    paymentModals.setShowNotificationModal(false);
    paymentState.showNotification('success', message, 3000);
  };

  const handleNotificationError = (message: string) => {
    paymentState.showNotification('error', message, 4000);
  };

  const handleNewOrder = () => {
    resetState();
    onComplete();
  };

  const handleSplitBack = () => {
    setView('selection');
    splitPayment.resetSplitPayment();
    paymentModals.closeModal();
  };

  const handleSplitTenderChange = (rowId: string, tender: SplitPaymentTender) => {
    splitPayment.handleSplitTenderChange(rowId, tender);
  };

  const handleSplitAmountChange = (rowId: string, amount: number) => {
    splitPayment.handleSplitAmountChange(rowId, amount);
  };

  const handleSplitAddRow = () => {
    splitPayment.handleSplitAddRow();
  };

  const handleSplitPayRow = (rowId: string) => {
    const row = splitPayment.splitRows.find((item) => item.id === rowId);
    if (!row || row.status !== 'pending') return;
    if (row.amount <= MIN_BALANCE) {
      paymentState.setPaymentError('Enter an amount for the split payment before charging.');
      return;
    }
    splitPayment.markRowProcessing(rowId);
    paymentModals.openModal(row.tender, row.amount, rowId);
  };

  useEffect(() => {
    if (view !== 'split') return;
    if (paymentState.isProcessing || paymentState.showCompletion) return;
    if (paymentModals.modalContext?.mode === 'split') return;
    if (transactionSubmission.pendingFinalization) return;

    const outstandingRows = splitPayment.splitRows.filter((row) => row.status !== 'completed');
    if (outstandingRows.some((row) => row.status === 'processing')) return;

    const completedRows = splitPayment.splitRows.filter((row) => row.status === 'completed');
    if (!completedRows.length) return;

    const payments = splitPayment.getCompletedPayments();
    if (payments.length !== completedRows.length) return;

    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, Number((total - paid).toFixed(2)));

    if (remaining <= MIN_BALANCE && outstandingRows.length === 0) {
      attemptFinalize(payments);
    }
  }, [
    view,
    splitPayment.splitRows,
    total,
    paymentState.isProcessing,
    paymentState.showCompletion,
    paymentModals.modalContext,
    transactionSubmission.pendingFinalization,
    attemptFinalize,
    splitPayment.getCompletedPayments,
  ]);

  if (!open) return null;

  if (paymentState.showCompletion && paymentState.completionData) {
    const summaryPayments = paymentState.lastSubmittedPayments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      details: generatePaymentSummary(payment),
    }));

    return (
      <>
        <div className="flex h-full w-full flex-col bg-gray-50 px-6 py-6 dark:bg-gray-900">
          <div className="flex flex-col gap-2 pb-6">
            <h2 className="text-2xl font-semibold text-black dark:text-white">Payment Complete</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transaction {paymentState.completionData.transactionNumber} recorded.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-boxdark">
            <OrderCompletionSummary
              transactionId={paymentState.completionData.transactionId}
              transactionNumber={paymentState.completionData.transactionNumber}
              totalAmount={paymentState.completionData.totalAmount}
              paymentMethods={summaryPayments}
              completedOrders={paymentState.completionData.completedOrders}
              giftCards={transactionSubmission.activatedGiftCards}
              onSendReceipt={() => paymentModals.setShowNotificationModal(true)}
              onPrintReceipt={() =>
                console.log('🖨️ Print receipt for', paymentState.completionData?.transactionNumber)
              }
              onProcessRefund={() =>
                console.log('↩️ Process refund for', paymentState.completionData?.transactionNumber)
              }
              onNewOrder={handleNewOrder}
            />
          </div>
        </div>

        <NotificationModal
          isOpen={paymentModals.showNotificationModal}
          onClose={() => paymentModals.setShowNotificationModal(false)}
          transactionNumber={paymentState.completionData.transactionNumber}
          transactionId={paymentState.completionData.transactionId}
          total={paymentState.completionData.totalAmount}
          customerEmail={customer?.email ?? undefined}
          customerPhone={customer?.phone ?? undefined}
          customerName={customerDisplayName}
          onSuccess={handleNotificationSuccess}
          onError={handleNotificationError}
          defaultChannels={['email']}
          title="Send Receipt"
        />

        <GiftCardHandoffModal
          open={paymentModals.showGiftCardHandoff}
          onClose={() => paymentModals.setShowGiftCardHandoff(false)}
          cards={transactionSubmission.activatedGiftCards}
          customerName={customerDisplayName}
          isDigital={transactionSubmission.activatedGiftCards.some((card) => card.type === 'DIGITAL')}
        />

        {paymentState.notificationStatus && (
          <div
            className={`fixed top-4 right-4 z-[100001] rounded-lg px-6 py-4 text-white shadow-lg ${
              paymentState.notificationStatus.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {paymentState.notificationStatus.message}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="flex h-full w-full flex-col bg-gray-50 dark:bg-gray-900">
          {view === 'split' ? (
            <SplitPaymentView
              total={total}
              rows={splitPayment.splitRows as any}
              remaining={splitPayment.splitRemaining}
              onBack={handleSplitBack}
              onChangeTender={handleSplitTenderChange}
              onChangeAmount={handleSplitAmountChange}
              onPayRow={handleSplitPayRow}
              onAddRow={handleSplitAddRow}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-6">
                <div>
                  <h2 className="text-2xl font-semibold text-black dark:text-white">Collect Payment</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {customerDisplayName ? `Customer: ${customerDisplayName}` : 'Walk-in Customer'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetState();
                    onCancel();
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-50 px-6 pb-8 space-y-6 dark:bg-gray-900">
                {paymentState.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {paymentState.error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl bg-transparent p-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Order Total
                    </span>
                    <div className="mt-1 text-2xl font-bold text-black dark:text-white">
                      {formatCurrency(total)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-transparent p-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Applied Adjustments
                    </span>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {appliedDiscounts.length > 0 || paymentDiscounts.giftCardRedemptions.length > 0 || paymentDiscounts.couponSuccess
                        ? (
                            <div className="space-y-1">
                              {appliedDiscounts.map((discount, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="truncate">{discount.description}</span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    −{formatCurrency(discount.amount)}
                                  </span>
                                </div>
                              ))}
                              {paymentDiscounts.giftCardRedemptions.length > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span>Gift Card</span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    −{formatCurrency(
                                      paymentDiscounts.giftCardRedemptions.reduce(
                                        (sum, card) => sum + card.amount,
                                        0,
                                      ),
                                    )}
                                  </span>
                                </div>
                              )}
                              {paymentDiscounts.couponSuccess && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  {paymentDiscounts.couponSuccess}
                                </div>
                              )}
                              {!appliedDiscounts.length &&
                                !paymentDiscounts.giftCardRedemptions.length &&
                                !paymentDiscounts.couponSuccess && <span>None</span>}
                            </div>
                          )
                        : 'None'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-transparent p-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Quick Actions
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => paymentState.toggleQuickAction('emailReceipt')}
                        className={`flex items-center justify-center rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          paymentState.quickActions.emailReceipt
                            ? 'bg-[#597485] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:text-[#597485]'
                        }`}
                      >
                        Email Receipt
                      </button>
                      <button
                        onClick={() => paymentState.toggleQuickAction('printReceipt')}
                        className={`flex items-center justify-center rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          paymentState.quickActions.printReceipt
                            ? 'bg-[#597485] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:text-[#597485]'
                        }`}
                      >
                        Print Receipt
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {PAYMENT_TILES.map((tile) => (
                    <button
                      key={tile.id}
                      onClick={() => handleTileClick(tile.id)}
                      disabled={paymentState.isProcessing}
                      className="group relative flex h-full flex-col rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#597485]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-boxdark"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#597485]/10 text-[#597485]">
                        {tile.icon}
                      </div>
                      <div className="text-lg font-semibold text-black dark:text-white">
                        {tile.label}
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
                        {tile.description}
                      </p>
                      {tile.id === 'discounts' && (
                        <span className="absolute right-5 top-5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 transition dark:bg-gray-800 dark:text-gray-300">
                          Adjustments
                        </span>
                      )}
                      {tile.id === 'split' && (
                        <span className="absolute right-5 top-5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 transition dark:bg-gray-800 dark:text-gray-300">
                          Multi Tender
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {paymentState.isProcessing && (
                  <div className="rounded-2xl border border-[#597485]/30 bg-[#597485]/5 px-4 py-3 text-sm text-[#597485]">
                    Processing payment… do not close the browser.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <CashPaymentModal
          open={paymentModals.activeModal === 'cash'}
          total={paymentModals.modalContext?.amount ?? total}
          onComplete={handleCashComplete}
          onCancel={handleModalCancel}
        />

        <CardPaymentModal
          open={paymentModals.activeModal === 'card_square' || paymentModals.activeModal === 'card_stripe'}
          total={paymentModals.modalContext?.amount ?? total}
          cardType="credit"
          orderIds={orderIds}
          customerEmail={customer?.email ?? undefined}
          customerPhone={customer?.phone ?? undefined}
          customerName={customerDisplayName}
          initialProvider={paymentModals.activeModal === 'card_stripe' ? 'stripe' : 'square'}
          onComplete={handleCardComplete}
          onCancel={handleModalCancel}
        />

        {paymentModals.activeModal &&
          (paymentModals.activeModal === 'house_account' ||
            paymentModals.activeModal === 'cod' ||
            paymentModals.activeModal === 'check') && (
            <ManualPaymentModal
              open
              methodLabel={MANUAL_METHOD_CONFIG[paymentModals.activeModal].label}
              defaultAmount={paymentModals.modalContext?.amount ?? total}
              requireReference={MANUAL_METHOD_CONFIG[paymentModals.activeModal].requireReference}
              referenceLabel={MANUAL_METHOD_CONFIG[paymentModals.activeModal].referenceLabel}
              instructions={MANUAL_METHOD_CONFIG[paymentModals.activeModal].instructions}
              onSubmit={(data) => handleManualComplete(paymentModals.activeModal as any, data)}
              onCancel={handleModalCancel}
            />
          )}

        <GiftCardActivationModal
          open={paymentModals.showGiftCardActivation}
          onClose={() => paymentModals.setShowGiftCardActivation(false)}
          orderItems={cartItems}
          onActivationComplete={handleGiftCardActivationComplete}
        />

        <NotificationModal
          isOpen={paymentModals.showNotificationModal}
          onClose={() => paymentModals.setShowNotificationModal(false)}
          transactionNumber={paymentState.completionData?.transactionNumber}
          transactionId={paymentState.completionData?.transactionId}
          total={paymentState.completionData?.totalAmount ?? total}
          customerEmail={customer?.email ?? undefined}
          customerPhone={customer?.phone ?? undefined}
          customerName={customerDisplayName}
          onSuccess={handleNotificationSuccess}
          onError={handleNotificationError}
          defaultChannels={['email']}
          title="Send Receipt"
        />

        <GiftCardHandoffModal
          open={paymentModals.showGiftCardHandoff}
          onClose={() => paymentModals.setShowGiftCardHandoff(false)}
          cards={transactionSubmission.activatedGiftCards}
          customerName={customerDisplayName}
          isDigital={transactionSubmission.activatedGiftCards.some((card) => card.type === 'DIGITAL')}
        />

        {paymentState.notificationStatus && (
          <div
            className={`fixed top-4 right-4 z-[100001] rounded-lg px-6 py-4 text-white shadow-lg ${
              paymentState.notificationStatus.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {paymentState.notificationStatus.message}
          </div>
        )}
      </div>

      {paymentModals.showAdjustments && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Discounts & Credits</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Apply manual discounts, redeem gift cards, or validate coupons before charging.
                </p>
              </div>
              <button
                onClick={() => paymentModals.setShowAdjustments(false)}
                className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-6 space-y-8">
              <section className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-black dark:text-white">Manual Discount</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Apply a one-off discount for this sale. Percentage discounts are calculated from the current total.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => paymentDiscounts.setManualDiscountType('percent')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      paymentDiscounts.manualDiscountType === 'percent'
                        ? 'bg-[#597485] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Percentage
                  </button>
                  <button
                    onClick={() => paymentDiscounts.setManualDiscountType('amount')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      paymentDiscounts.manualDiscountType === 'amount'
                        ? 'bg-[#597485] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Dollar Amount
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-[200px,1fr]">
                  <InputField
                    label={paymentDiscounts.manualDiscountType === 'percent' ? 'Percent (%)' : 'Amount ($)'}
                    type="number"
                    min="0"
                    step={paymentDiscounts.manualDiscountType === 'percent' ? 1 : 0.01}
                    value={paymentDiscounts.manualDiscountValue}
                    onChange={(event) => paymentDiscounts.setManualDiscountValue(event.target.value)}
                  />
                  <InputField
                    label="Reason (Optional)"
                    value={paymentDiscounts.manualDiscountReason}
                    onChange={(event) => paymentDiscounts.setManualDiscountReason(event.target.value)}
                  />
                </div>
                {paymentDiscounts.manualDiscountError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {paymentDiscounts.manualDiscountError}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={handleApplyManualDiscount}
                    className="rounded-lg bg-[#597485] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4e6575]"
                  >
                    Apply Discount
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-black dark:text-white">Gift Card Redemption</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Validate and apply store gift cards. Redemption occurs after payment is finalized.
                  </p>
                </div>
                <GiftCardInput onGiftCardChange={(amount, redemptions) => paymentDiscounts.handleGiftCardChange(amount, redemptions)} grandTotal={total} />
              </section>

              <section className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-black dark:text-white">Coupon Code</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Check eligibility and apply coupon codes sourced from POS settings.
                  </p>
                </div>
                <CouponInput
                  couponCode={paymentDiscounts.couponCode}
                  setCouponCode={(val) => {
                    paymentDiscounts.setCouponCode(val);
                    paymentDiscounts.setCouponError('');
                    paymentDiscounts.setCouponSuccess('');
                  }}
                  onCouponValidation={handleCouponValidation}
                  isValidating={isValidating}
                  couponError={paymentDiscounts.couponError}
                  couponSuccess={paymentDiscounts.couponSuccess}
                  isValid={isCouponValid}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleApplyCoupon}
                    className="rounded-lg bg-[#597485] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4e6575]"
                  >
                    Apply Coupon
                  </button>
                  <button
                    onClick={() => paymentDiscounts.removeCoupon()}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Remove Coupon
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentController;
