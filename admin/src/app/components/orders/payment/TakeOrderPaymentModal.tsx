import { FC, useEffect, useMemo, useState } from 'react';
import PaymentMethodGrid from '@app/components/pos/payment/PaymentMethodGrid';
import CashPaymentModal from '@app/components/pos/payment/CashPaymentModal';
import CardPaymentModal from '@app/components/pos/payment/CardPaymentModal';
import ManualPaymentModal from '@app/components/pos/payment/ManualPaymentModal';
import usePaymentSettingsConfig from '@domains/payments/hooks/usePaymentSettingsConfig';
import {
  getPaymentMethods,
  getPaymentMethodsWithOptions,
  PaymentMethodConfig
} from '@shared/utils/paymentMethods';
import Button from '@shared/ui/components/ui/button/Button';
import InputField from '@shared/ui/forms/input/InputField';
import Label from '@shared/ui/forms/Label';

export type PaymentEntry = {
  method: string;
  amount: number;
  metadata?: Record<string, any>;
};

type ManualPaymentState = {
  methodId: string;
  label: string;
  offlineId?: string;
  requiresReference?: boolean;
  referenceLabel?: string;
  instructions?: string;
};

type Props = {
  open: boolean;
  total: number;
  giftCardDiscount: number;
  onClose: () => void;
  onConfirm: (payments: PaymentEntry[]) => void;
  employee: string;
  setFormError: (val: string | null) => void;
  isOverlay?: boolean;
  customer?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

const TakeOrderPaymentModal: FC<Props> = ({
  open,
  total,
  giftCardDiscount,
  onClose,
  onConfirm,
  employee,
  setFormError,
  isOverlay = false,
  customer,
}) => {
  const { settings: paymentSettings, offlineMethods } = usePaymentSettingsConfig();
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [nextAmountInput, setNextAmountInput] = useState<string>(total.toFixed(2));
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [manualPaymentConfig, setManualPaymentConfig] = useState<ManualPaymentState | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const availableMethods = useMemo(() => {
    if (!open) {
      return [] as PaymentMethodConfig[];
    }

    const base = paymentSettings
      ? getPaymentMethodsWithOptions('admin', {
          builtIn: paymentSettings.builtInMethods,
          offlineMethods,
        })
      : getPaymentMethods('admin');

    return base.filter((method) => method.id !== 'split');
  }, [paymentSettings, offlineMethods, open]);

  const calculateRemaining = (entries: PaymentEntry[] = payments) => {
    const sum = entries.reduce((acc, payment) => acc + payment.amount, 0);
    const remaining = total - sum;
    return Number.isNaN(remaining) ? total : remaining;
  };

  const remainingAmount = useMemo(() => calculateRemaining(), [payments, total]);

  useEffect(() => {
    if (open) {
      setFormError(null);
      setLocalError(null);
    }
  }, [open, setFormError]);

  useEffect(() => {
    if (!open) {
      setPayments([]);
      setSelectedMethodId('');
      setNextAmountInput(total.toFixed(2));
      setPendingAmount(null);
      setShowCashModal(false);
      setShowCardModal(false);
      setManualPaymentConfig(null);
      setLocalError(null);
    }
  }, [open, total]);

  useEffect(() => {
    if (!open) return;
    const remaining = calculateRemaining();
    const clamped = Math.max(0, remaining);
    setNextAmountInput(clamped.toFixed(2));
  }, [payments, open]);

  const handleAddPayment = (entry: PaymentEntry) => {
    setPayments((prev) => {
      const updated = [...prev, entry];
      return updated;
    });
    setPendingAmount(null);
    setShowCashModal(false);
    setShowCardModal(false);
    setManualPaymentConfig(null);
    setSelectedMethodId('');
    setLocalError(null);
  };

  const handleRemovePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedMethodId('');
  };

  const closeModal = () => {
    setPayments([]);
    setPendingAmount(null);
    setSelectedMethodId('');
    setShowCashModal(false);
    setShowCardModal(false);
    setManualPaymentConfig(null);
    setLocalError(null);
    onClose();
  };

  const validateNextAmount = (): number | null => {
    const parsed = parseFloat(nextAmountInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setLocalError('Enter a valid amount to apply.');
      return null;
    }

    const remaining = calculateRemaining();
    if (parsed - remaining > 0.01) {
      setLocalError('Amount exceeds remaining balance.');
      return null;
    }

    setLocalError(null);
    return parsed;
  };

  const handleMethodSelect = (methodConfig: PaymentMethodConfig) => {
    if (!open) return;

    const method = methodConfig.id;

    if (method === 'send_to_pos') {
      setSelectedMethodId(method);
      onConfirm([
        {
          method: 'send_to_pos',
          amount: total,
          metadata: { employee },
        },
      ]);
      closeModal();
      return;
    }

    const amount = validateNextAmount();
    if (amount === null) {
      return;
    }

    setSelectedMethodId(method);
    if (amount === 0 && total > 0) {
      setLocalError('Amount must be greater than zero.');
      return;
    }

    setPendingAmount(amount);

    if (method === 'cash') {
      setShowCashModal(true);
      return;
    }

    if (method === 'credit' || method === 'debit') {
      setShowCardModal(true);
      return;
    }

    if (method === 'house_account' || method === 'cod' || method === 'check' || method.startsWith('offline:')) {
      let referenceLabel = 'Reference';
      let requiresReference = false;
      let instructions = methodConfig.meta?.instructions || methodConfig.description;

      if (method === 'check') {
        referenceLabel = 'Check Number';
        requiresReference = true;
      } else if (method === 'house_account') {
        referenceLabel = 'Account Reference';
      } else if (method === 'cod') {
        referenceLabel = 'Delivery Notes';
      }

      if (methodConfig.meta?.requiresReference) {
        requiresReference = true;
      }

      setManualPaymentConfig({
        methodId: method,
        label: methodConfig.label,
        offlineId: methodConfig.offlineId,
        requiresReference,
        referenceLabel,
        instructions,
      });
      return;
    }

    // Default fallback adds payment immediately
    handleAddPayment({ method, amount, metadata: {} });
  };

  const handleCashComplete = (paymentData: { cashReceived: number; changeDue: number }) => {
    if (pendingAmount === null) return;
    handleAddPayment({
      method: 'cash',
      amount: pendingAmount,
      metadata: {
        cashReceived: paymentData.cashReceived,
        changeDue: paymentData.changeDue,
      },
    });
  };

  const handleCardComplete = (paymentData: {
    method: string;
    provider: 'stripe' | 'square';
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
  }) => {
    if (pendingAmount === null) return;
    handleAddPayment({
      method: 'credit',
      amount: pendingAmount,
      metadata: {
        ...paymentData,
      },
    });
  };

  const handleManualPaymentSubmit = ({ amount, reference }: { amount: number; reference?: string }) => {
    if (pendingAmount === null || !manualPaymentConfig) return;

    const metadata: Record<string, any> = {};
    if (reference) {
      metadata.reference = reference;
      if (manualPaymentConfig.methodId === 'check') {
        metadata.checkNumber = reference;
      }
    }
    if (manualPaymentConfig.offlineId) {
      metadata.offlineMethodId = manualPaymentConfig.offlineId;
    }

    handleAddPayment({
      method: manualPaymentConfig.methodId,
      amount: pendingAmount,
      metadata,
    });
  };

  const handleConfirm = () => {
    if (total > 0 && Math.abs(remainingAmount) > 0.01) {
      const message = 'Payments do not cover the total amount.';
      setLocalError(message);
      setFormError(message);
      return;
    }

    setFormError(null);
    setLocalError(null);
    onConfirm(payments);
    closeModal();
  };

  if (!open) return null;

  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()
    : '';

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">Collect Payment</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Remaining balance updates as you add payments. Provide receipts after final confirmation.
            </p>
          </div>
          <button
            onClick={closeModal}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-5">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <Label>Total Due</Label>
              <div className="text-2xl font-bold text-[#597485]">
                ${total.toFixed(2)}
              </div>
              {giftCardDiscount > 0 && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  Gift Card Applied: -${giftCardDiscount.toFixed(2)}
                </p>
              )}
              <div className="mt-4 space-y-2">
                <Label>Amount to Apply Next</Label>
                <InputField
                  type="number"
                  step={0.01}
                  min="0"
                  value={nextAmountInput}
                  onChange={(event) => setNextAmountInput(event.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Adjust before selecting a payment method to split payments.
                </p>
              </div>
              <div className="mt-4">
                <Label>Remaining Balance</Label>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${Math.max(0, remainingAmount).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payments Added</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
                </span>
              </div>
              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No payments yet. Select a method to add one.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment, index) => {
                    const label = availableMethods.find((m) => m.id === payment.method)?.label ?? payment.method;
                    return (
                      <div
                        key={`${payment.method}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{label}</div>
                          {payment.metadata?.reference && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Ref: {payment.metadata.reference}
                            </div>
                          )}
                          {payment.metadata?.cashReceived && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Received ${payment.metadata.cashReceived.toFixed?.(2) ?? payment.metadata.cashReceived}
                              {payment.metadata.changeDue ? ` • Change $${payment.metadata.changeDue.toFixed?.(2) ?? payment.metadata.changeDue}` : ''}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#597485]">
                            ${payment.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemovePayment(index)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-3 space-y-6">
            <PaymentMethodGrid
              selectedMethod={selectedMethodId}
              onSelect={handleMethodSelect}
              total={total}
              couponCode=""
              setCouponCode={() => {}}
              onCouponValidation={() => {}}
              isValidatingCoupon={false}
              couponError=""
              couponSuccess=""
              isCouponValid={false}
              onGiftCardChange={() => {}}
              onManualDiscount={() => {}}
              appliedDiscounts={[]}
              onCouponAdd={async () => false}
            />
            {localError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {localError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Confirm Payment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Payment Modal */}
      <CashPaymentModal
        open={showCashModal}
        total={pendingAmount ?? 0}
        onComplete={handleCashComplete}
        onCancel={() => {
          setShowCashModal(false);
          setPendingAmount(null);
        }}
      />

      {/* Card Payment Modal */}
      <CardPaymentModal
        open={showCardModal}
        total={pendingAmount ?? 0}
        cardType="credit"
        customerEmail={customer?.email ?? undefined}
        customerPhone={customer?.phone ?? undefined}
        customerName={customerName || undefined}
        orderIds={[]}
        onComplete={handleCardComplete}
        onCancel={() => {
          setShowCardModal(false);
          setPendingAmount(null);
        }}
      />

      {/* Manual Offline Payment */}
      <ManualPaymentModal
        open={manualPaymentConfig !== null}
        methodLabel={manualPaymentConfig?.label ?? ''}
        defaultAmount={pendingAmount ?? 0}
        requireReference={manualPaymentConfig?.requiresReference ?? false}
        referenceLabel={manualPaymentConfig?.referenceLabel ?? 'Reference'}
        instructions={manualPaymentConfig?.instructions}
        onSubmit={handleManualPaymentSubmit}
        onCancel={() => {
          setManualPaymentConfig(null);
          setPendingAmount(null);
        }}
      />
    </div>
  );
};

export default TakeOrderPaymentModal;

