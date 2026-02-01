import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import CashPaymentModal from './CashPaymentModal';
import CardPaymentModal from './CardPaymentModal';
import ManualPaymentModal from './ManualPaymentModal';
import SplitPaymentView, {
  SplitPaymentRow,
  SplitPaymentTender,
} from './SplitPaymentView';
import NotificationModal from './NotificationModal';
import RefundModal from '../../refunds/RefundModal';
import OrderCompletionSummary from './OrderCompletionSummary';
import GiftCardActivationModal from '../../orders/payment/GiftCardActivationModal';
import GiftCardHandoffModal from '../../orders/payment/GiftCardHandoffModal';
import AdjustmentsModal from '../../orders/payment/AdjustmentsModal';
import { orderContainsGiftCards } from '@shared/utils/giftCardHelpers';
import { useCouponValidation } from '@shared/hooks/useCouponValidation';
import { formatCurrency } from '@shared/utils/currency';
import { mapPaymentMethodType, getPaymentProvider, transformCartToOrders, generatePaymentSummary } from '@shared/utils/paymentHelpers';
import { getOrCreateGuestCustomer, getCustomerDisplayName } from '@shared/utils/customerHelpers';
import { usePaymentState } from '@domains/payments/hooks/usePaymentState';
import { usePaymentModals } from '@domains/payments/hooks/usePaymentModals';
import { usePaymentDiscounts } from '@domains/payments/hooks/usePaymentDiscounts';
import { useSplitPayment } from '@domains/payments/hooks/useSplitPayment';
import { useTransactionSubmission } from '@domains/payments/hooks/useTransactionSubmission';
import { useApiClient } from '@shared/hooks/useApiClient';
import {
  BoltIcon,
  CreditCardIcon,
  DocsIcon,
  DollarLineIcon,
  DollarSignIcon,
  HomeIcon,
  TruckIcon,
} from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';

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

const iconWrapperClass = 'h-7 w-7 text-gray-700 dark:text-gray-400';

const PAYMENT_TILES: PaymentTile[] = [
  {
    id: 'cash',
    label: 'Cash',
    description: '',
    icon: <DollarLineIcon className={iconWrapperClass} />,
  },
  {
    id: 'card_stripe',
    label: 'Credit Card',
    description: '',
    icon: <CreditCardIcon className={iconWrapperClass} />,
  },
  {
    id: 'house_account',
    label: 'House Account',
    description: '',
    icon: <HomeIcon className={iconWrapperClass} />,
  },
  {
    id: 'cod',
    label: 'COD/Pay Later',
    description: '',
    icon: <TruckIcon className={iconWrapperClass} />,
  },
  {
    id: 'check',
    label: 'Check',
    description: '',
    icon: <DocsIcon className={iconWrapperClass} />,
  },
  {
    id: 'split',
    label: 'Split Payment',
    description: '',
    icon: <BoltIcon className={iconWrapperClass} />,
  },
  {
    id: 'discounts',
    label: 'Discounts',
    description: '',
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
    referenceLabel: 'Person Ordered',
    instructions: 'Enter the name of the person who ordered on this account.',
    requireReference: true,
  },
  cod: {
    label: 'COD/Pay Later',
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

const MIN_BALANCE = 1;

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
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundTransactionNumber, setRefundTransactionNumber] = useState<string | null>(null);

  // Use extracted hooks
  const paymentState = usePaymentState();
  const paymentModals = usePaymentModals();
  const paymentDiscounts = usePaymentDiscounts(appliedDiscounts, onDiscountsChange, onGiftCardChange, onCouponChange);
  const splitPayment = useSplitPayment(total);
  const transactionSubmission = useTransactionSubmission();
  const apiClient = useApiClient();
  const [fingerprintMatches, setFingerprintMatches] = useState<{
    fingerprint: string;
    candidates: Array<{ id: string; firstName?: string; lastName?: string; email?: string; phone?: string }>;
  } | null>(null);
  const [fingerprintMatchError, setFingerprintMatchError] = useState<string | null>(null);
  const [isMatchingFingerprint, setIsMatchingFingerprint] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState<{
    completion: CompletionData;
    payments: PaymentPayload[];
    completedOrderIds: string[];
    transaction: any;
  } | null>(null);

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
  const giftCardTotal = useMemo(
    () => paymentDiscounts.giftCardRedemptions.reduce((sum, card) => sum + card.amount, 0),
    [paymentDiscounts.giftCardRedemptions]
  );

  // Reset all state
  const resetState = () => {
    setView('selection');
    paymentState.resetPaymentState();
    paymentModals.resetModals();
    paymentDiscounts.resetDiscounts();
    splitPayment.resetSplitPayment();
    transactionSubmission.resetTransaction();
    clearValidation();
    setRefundModalOpen(false);
    setRefundTransactionNumber(null);
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

  const handleCouponCodeChange = (value: string) => {
    paymentDiscounts.setCouponCode(value);
    paymentDiscounts.setCouponError('');
    paymentDiscounts.setCouponSuccess('');
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
    const categoryIds = [
      ...new Set(
        cartItems.flatMap((item) =>
          item.categoryIds || (item.categoryId ? [item.categoryId] : [])
        )
      ),
    ].filter(Boolean);

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

    paymentModals.openModal(tileId, total);
  };

  const handleModalCancel = () => {
    if (paymentModals.modalContext?.mode === 'split' && paymentModals.modalContext.rowId) {
      splitPayment.cancelRowPayment(paymentModals.modalContext.rowId);
    }
    paymentModals.closeModal();
  };

  const fetchFingerprintMatches = async (fingerprint: string): Promise<boolean> => {
    try {
      setIsMatchingFingerprint(true);
      setFingerprintMatchError(null);
      const response = await apiClient.post('/api/customer-payment-methods/match', {
        cardFingerprint: fingerprint,
      });
      const matches = response.data?.matches || [];
      if (matches.length > 0) {
        setFingerprintMatches({ fingerprint, candidates: matches });
        return true;
      }
    } catch (err: any) {
      setFingerprintMatchError(err?.message || 'Failed to check fingerprint matches');
    } finally {
      setIsMatchingFingerprint(false);
    }
    return false;
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

  const finishCompletion = async (completion: CompletionData, payments: PaymentPayload[], completedOrderIds: string[], transaction: any) => {
    paymentState.completePayment(completion, payments);
    paymentModals.setShowAdjustments(false);
    transactionSubmission.setPendingFinalization(null);
    setView('selection');

    if (paymentState.quickActions.emailReceipt) {
      paymentModals.setShowNotificationModal(true);
    }
    if (paymentState.quickActions.printReceipt) {
      try {
        const settingsResponse = await apiClient.get('/api/print-settings');
        if (settingsResponse.status < 400 && settingsResponse.data?.receiptsDestination === 'browser') {
          for (const id of completedOrderIds) {
            const printResponse = await apiClient.post(`/api/print/receipt/${id}`);
            if (printResponse.status < 400 && printResponse.data?.action === 'browser-print' && printResponse.data?.pdfUrl) {
              window.open(printResponse.data.pdfUrl, '_blank');
            }
          }
        }
      } catch (printError) {
        console.error('Failed to trigger receipt print:', printError);
      }
    }

    onComplete({
      transactionNumber: transaction.transactionNumber,
      transactionId: transaction.id,
      totalAmount: completion.totalAmount,
      customerId: customer?.id,
      orderIds,
    });
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
      const fingerprintFromPayment = payments.find((p) => p.metadata?.cardFingerprint)?.metadata?.cardFingerprint;
      let hasMatches = false;
      if (!customer?.id && fingerprintFromPayment) {
        hasMatches = await fetchFingerprintMatches(fingerprintFromPayment);
      }
      const completedOrderIds = result.data?.orderIds || orderIds || [];

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

      // If fingerprint matches found, defer completion until user dismisses the modal
      if (hasMatches) {
        setPendingCompletion({ completion, payments, completedOrderIds, transaction });
        return;
      }

      await finishCompletion(completion, payments, completedOrderIds, transaction);
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
    if (!paymentModals.modalContext) {
      console.error('❌ finalizeFromModal called but modalContext is null');
      return;
    }

    if (paymentModals.modalContext.mode === 'split' && paymentModals.modalContext.rowId) {
      const amount = Math.round(paymentModals.modalContext.amount);
      const payment: PaymentPayload = { ...payload, amount };
      const details = rowNote ?? generatePaymentSummary(payment);
      splitPayment.completeRowPayment(paymentModals.modalContext.rowId, payment, details);
      paymentModals.closeModal();
      return;
    }

    const amount = Math.round(paymentModals.modalContext.amount);
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
  transactionId?: string;
  paymentIntentId?: string;
  cardLast4?: string;
  cardBrand?: string;
  cardFingerprint?: string;
}) => {
  if (!paymentModals.modalContext) return;
  finalizeFromModal(
    {
      method: 'credit',
      amount: paymentModals.modalContext.amount,
      metadata: {
        provider: 'stripe',
        transactionId: data.transactionId,
        paymentIntentId: data.paymentIntentId,
        cardLast4: data.cardLast4,
        cardBrand: data.cardBrand,
        cardFingerprint: data.cardFingerprint,
      },
    },
    `Stripe ${data.transactionId ? `• ${data.transactionId}` : ''}`,
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

  const handleSplitDeleteRow = (rowId: string) => {
    splitPayment.handleSplitDeleteRow(rowId);
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
    const remaining = Math.max(0, total - paid);

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
                {
                  const transactionNumber = paymentState.completionData?.transactionNumber;
                  if (transactionNumber) {
                    setRefundTransactionNumber(transactionNumber);
                    setRefundModalOpen(true);
                  }
                }
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

        <RefundModal
          isOpen={refundModalOpen}
          transactionNumber={refundTransactionNumber}
          onClose={() => {
            setRefundModalOpen(false);
            setRefundTransactionNumber(null);
          }}
          onRefundComplete={() => {
            setRefundModalOpen(false);
            setRefundTransactionNumber(null);
          }}
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
              onDeleteRow={handleSplitDeleteRow}
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
                            ? 'bg-brand-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:text-brand-500'
                        }`}
                      >
                        Email Receipt
                      </button>
                      <button
                        onClick={() => paymentState.toggleQuickAction('printReceipt')}
                        className={`flex items-center justify-center rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          paymentState.quickActions.printReceipt
                            ? 'bg-brand-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:text-brand-500'
                        }`}
                      >
                        Print Receipt
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {PAYMENT_TILES.map((tile) => (
                    <button
                      key={tile.id}
                      onClick={() => handleTileClick(tile.id)}
                      disabled={paymentState.isProcessing}
                      className="group relative flex h-26 w-65 items-center gap-4 rounded-2xl bg-white px-6 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-boxdark"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                        {tile.icon}
                      </div>
                      <div className="text-xl font-medium text-black dark:text-white">
                        {tile.label}
                      </div>
                    </button>
                  ))}
                </div>

                {paymentState.isProcessing && (
                  <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 px-4 py-3 text-sm text-brand-500">
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
          open={paymentModals.activeModal === 'card_stripe'}
          total={paymentModals.modalContext?.amount ?? total}
          cardType="credit"
          orderIds={orderIds}
          bloomCustomerId={customer?.id ?? undefined}
          customerEmail={customer?.email ?? undefined}
          customerPhone={customer?.phone ?? undefined}
          customerName={customerDisplayName}
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

        <Modal
          isOpen={Boolean(fingerprintMatches)}
          onClose={() => {
            setFingerprintMatches(null);
            if (pendingCompletion) {
              finishCompletion(pendingCompletion.completion, pendingCompletion.payments, pendingCompletion.completedOrderIds, pendingCompletion.transaction);
              setPendingCompletion(null);
            }
          }}
          className="max-w-xl"
        >
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Possible customer match
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This card fingerprint was seen before. Confirm with the customer if this is their account.
            </p>
            {fingerprintMatches?.candidates?.map((c) => (
              <div key={c.id} className="mb-3 rounded border border-stroke/70 p-3 dark:border-strokedark">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown name'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {c.email || '—'} · {c.phone || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-brand-500 hover:bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
                    onClick={async () => {
                      try {
                        // Reassign orders to matched customer
                        console.log('🔗 Linking to customer:', c.id, 'orders:', pendingCompletion?.completedOrderIds, 'transaction:', pendingCompletion?.transaction?.id);
                        if (pendingCompletion?.completedOrderIds) {
                          for (const orderId of pendingCompletion.completedOrderIds) {
                            const res = await apiClient.put(`/api/orders/${orderId}/update`, { customerId: c.id });
                            console.log('🔗 Order update response:', orderId, res.status, res.data);
                          }
                        }
                        // Reassign transaction to matched customer
                        if (pendingCompletion?.transaction?.id) {
                          const res = await apiClient.put(`/api/payment-transactions/${pendingCompletion.transaction.id}`, { customerId: c.id });
                          console.log('🔗 Transaction update response:', res.status, res.data);
                        }
                        paymentState.showNotification('success', `Order linked to ${c.firstName || 'customer'}.`, 3000);
                      } catch (err) {
                        console.error('Failed to link customer:', err);
                        paymentState.showNotification('error', 'Failed to link customer to order.', 3000);
                      }
                      setFingerprintMatches(null);
                      if (pendingCompletion) {
                        finishCompletion(pendingCompletion.completion, pendingCompletion.payments, pendingCompletion.completedOrderIds, pendingCompletion.transaction);
                        setPendingCompletion(null);
                      }
                    }}
                  >
                    Link to customer
                  </button>
                </div>
              </div>
            ))}
            {fingerprintMatches && fingerprintMatches.candidates.length === 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-300">No matches found.</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-stroke px-3 py-2 text-sm font-semibold text-gray-700 dark:text-white dark:border-strokedark"
                onClick={() => {
                  setFingerprintMatches(null);
                  if (pendingCompletion) {
                    finishCompletion(pendingCompletion.completion, pendingCompletion.payments, pendingCompletion.completedOrderIds, pendingCompletion.transaction);
                    setPendingCompletion(null);
                  }
                }}
              >
                Skip
              </button>
            </div>
            {fingerprintMatchError && (
              <p className="text-sm text-red-500 mt-3">{fingerprintMatchError}</p>
            )}
            {isMatchingFingerprint && (
              <p className="text-sm text-gray-500 mt-3">Checking for matches…</p>
            )}
          </div>
        </Modal>
      </div>

      <AdjustmentsModal
        open={paymentModals.showAdjustments}
        onClose={() => paymentModals.setShowAdjustments(false)}
        discountType={paymentDiscounts.manualDiscountType}
        discountValue={paymentDiscounts.manualDiscountValue || ""}
        onDiscountTypeChange={paymentDiscounts.setManualDiscountType}
        onDiscountValueChange={paymentDiscounts.setManualDiscountValue}
        discountReason={paymentDiscounts.manualDiscountReason}
        onDiscountReasonChange={paymentDiscounts.setManualDiscountReason}
        discountError={paymentDiscounts.manualDiscountError}
        onApplyDiscount={handleApplyManualDiscount}
        couponCode={paymentDiscounts.couponCode}
        setCouponCode={handleCouponCodeChange}
        onCouponValidation={handleCouponValidation}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={() => paymentDiscounts.removeCoupon()}
        isValidating={isValidating}
        couponError={paymentDiscounts.couponError}
        couponSuccess={paymentDiscounts.couponSuccess}
        isCouponValid={isCouponValid}
        grandTotal={total + giftCardTotal}
        onGiftCardChange={(amount, redemptions) =>
          paymentDiscounts.handleGiftCardChange(amount, redemptions)
        }
      />
    </>
  );
};

export default PaymentController;
