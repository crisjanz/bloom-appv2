import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UnifiedPaymentModal, CashMethodFields, CardMethodFields, OfflineMethodFields } from '@app/components/payments/unified';
import GiftCardInput from '@app/components/orders/payment/GiftCardInput';
import usePaymentComposer, { PaymentEntry } from '@domains/payments/hooks/usePaymentComposer';
import usePaymentSettingsConfig from '@domains/payments/hooks/usePaymentSettingsConfig';
import {
  getPaymentMethods,
  getPaymentMethodsWithOptions,
  PaymentMethodConfig,
} from '@shared/utils/paymentMethods';
import ManualCardEntry, { ManualCardFormHandle, CardSubmissionResult } from './ManualCardEntryForms';

type QuickActionsState = {
  printReceipt: boolean;
  printTicket: boolean;
  emailReceipt: boolean;
};

type Props = {
  open: boolean;
  total: number;
  giftCardDiscount: number;
  giftCardRedemptions: Array<{ cardNumber: string; amount: number }>;
  onGiftCardChange: (amount: number, data?: Array<{ cardNumber: string; amount: number }>) => void;
  onClose: () => void;
  onConfirm: (payments: PaymentEntry[]) => void;
  customer?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  quickActions?: QuickActionsState;
  onQuickActionsChange?: (actions: QuickActionsState) => void;
};

const EXCLUDED_METHODS = new Set(['split', 'other_methods']);

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const TakeOrderUnifiedPaymentModal: FC<Props> = ({
  open,
  total,
  giftCardDiscount,
  giftCardRedemptions,
  onGiftCardChange,
  onClose,
  onConfirm,
  customer,
  quickActions,
  onQuickActionsChange,
}) => {
  const { settings: paymentSettings, offlineMethods } = usePaymentSettingsConfig();
  const [selectedMethod, setSelectedMethod] = useState<string>('credit|stripe');
  const [amountInput, setAmountInput] = useState<string>(total.toFixed(2));
  const [referenceValue, setReferenceValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [autoCompletePending, setAutoCompletePending] = useState(false);
  const cardFormRef = useRef<ManualCardFormHandle | null>(null);
  const assignCardForm = useCallback((instance: ManualCardFormHandle | null) => {
    cardFormRef.current = instance;
  }, []);

  const { payments, addPayment, removePayment, resetPayments } = usePaymentComposer({ total });

  const quickActionsState: QuickActionsState = quickActions ?? {
    printReceipt: false,
    printTicket: false,
    emailReceipt: false,
  };

  const toggleQuickAction = (key: keyof QuickActionsState) => {
    const next = { ...quickActionsState, [key]: !quickActionsState[key] };
    onQuickActionsChange?.(next);
  };

  const quickActionButton = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 sm:h-14 min-w-[100px] sm:min-w-[120px] items-center justify-center rounded-lg border-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-colors ${
        active
          ? 'border-[#597485] bg-[#597485] text-white shadow-lg'
          : 'border-gray-200 bg-gray-100 text-gray-600 hover:border-[#597485] hover:text-[#597485]'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );

  type UiPaymentMethod = {
    value: string;
    label: string;
    baseId: string;
    provider?: 'stripe' | 'square';
    config: PaymentMethodConfig;
  };

  const availableMethods: UiPaymentMethod[] = useMemo(() => {
    const base = paymentSettings
      ? getPaymentMethodsWithOptions('admin', {
          builtIn: paymentSettings.builtInMethods,
          offlineMethods,
        })
      : getPaymentMethods('admin');

    return base
      .filter((method) => !EXCLUDED_METHODS.has(method.id))
      .flatMap((method) => {
        if (method.id === 'credit') {
          return [
            {
              value: 'credit|stripe',
              label: 'Credit Card (Stripe)',
              baseId: 'credit',
              provider: 'stripe' as const,
              config: method,
            },
            {
              value: 'credit|square',
              label: 'Credit Card (Square)',
              baseId: 'credit',
              provider: 'square' as const,
              config: method,
            },
          ];
        }

        return [
          {
            value: method.id,
            label: method.label,
            baseId: method.id,
            config: method,
          },
        ];
      });
  }, [paymentSettings, offlineMethods]);

  useEffect(() => {
    if (!open) return;
    if (!availableMethods.find((method) => method.value === selectedMethod)) {
      setSelectedMethod(availableMethods[0]?.value ?? '');
    }
  }, [availableMethods, selectedMethod, open]);

  const paymentMethodOptions = useMemo(
    () =>
      availableMethods.map((method) => ({
        value: method.value,
        label: method.label,
      })),
    [availableMethods]
  );

  const methodOption = availableMethods.find((method) => method.value === selectedMethod) ?? availableMethods[0];
  const methodConfig = methodOption?.config;
  const baseMethodId = methodConfig?.id ?? '';

  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()
    : '';

  const manualPaymentsTotal = payments.reduce((sum, entry) => sum + entry.amount, 0);
  const appliedTotal = manualPaymentsTotal + giftCardDiscount;
  const remaining = Math.max(0, Number((total - appliedTotal).toFixed(2)));

  const enteredAmount = parseFloat(amountInput || '0');
  const coversRemaining = !Number.isNaN(enteredAmount) && Math.abs(enteredAmount - remaining) < 0.01;
  const isCardMethod = methodOption?.baseId === 'credit';
  const isOfflineMethod =
    baseMethodId === 'house_account' ||
    baseMethodId === 'check' ||
    baseMethodId === 'cod' ||
    baseMethodId.startsWith('offline:');
  const providerLabel = methodOption?.provider === 'square' ? 'Square' : 'Stripe';
  const targetCardAmount = coversRemaining ? remaining : enteredAmount;
  const manualEntryAmount = Number.isFinite(targetCardAmount) ? Math.max(0, targetCardAmount) : 0;
  const hasValidCardAmount = manualEntryAmount > 0;
  const hasValidCashAmount = !Number.isNaN(enteredAmount) && enteredAmount > 0;
  const hasValidOfflineAmount = hasValidCashAmount;
  const offlineMeta = methodConfig?.meta ?? {};
  const requiresReference =
    baseMethodId === 'check' || (isOfflineMethod && typeof offlineMeta?.requiresReference === 'boolean'
      ? offlineMeta.requiresReference
      : false);
  const referenceMissing = requiresReference && referenceValue.trim().length === 0;
  const offlineReferenceLabel =
    baseMethodId === 'check'
      ? 'Check Number'
      : baseMethodId === 'house_account'
      ? 'Account Reference'
      : baseMethodId === 'cod'
      ? 'Delivery Notes'
      : 'Reference';

  const resetDraft = (nextRemainingValue?: number) => {
    const base = typeof nextRemainingValue === 'number' ? nextRemainingValue : remaining;
    const normalized = Number.isFinite(base) ? Math.max(0, Number(base.toFixed(2))) : Math.max(0, Number(remaining.toFixed(2)));
    setReferenceValue('');
    setAmountInput(normalized.toFixed(2));
  };

  const validateAmount = (): number | null => {
    const parsed = parseFloat(amountInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount to apply.');
      return null;
    }
    if (parsed - remaining > 0.01) {
      setError('Amount exceeds remaining balance.');
      return null;
    }
    setError(null);
    return parsed;
  };

  const submitCashPayment = useCallback(() => {
    if (remaining <= 0) {
      setError('Payment total already satisfied.');
      return;
    }

    const parsed = parseFloat(amountInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter the cash amount received.');
      return;
    }

    const amountToApply = Math.min(parsed, remaining);
    const changeDue = parsed > amountToApply ? Number((parsed - amountToApply).toFixed(2)) : 0;

    addPayment({
      method: 'cash',
      amount: Number(amountToApply.toFixed(2)),
      metadata: {
        cashReceived: Number(parsed.toFixed(2)),
        changeDue,
      },
    });

    const nextRemaining = Math.max(0, Number((remaining - amountToApply).toFixed(2)));
    resetDraft(nextRemaining);
    setError(null);

    if (nextRemaining <= 0.01) {
      setAutoCompletePending(true);
    }
  }, [addPayment, amountInput, remaining, resetDraft]);

  const handleCardComplete = useCallback(
    (amount: number, submission?: CardSubmissionResult['result']) => {
      const metadata = submission
        ? {
            ...submission,
            provider: submission.provider ?? methodOption?.provider ?? 'stripe',
          }
        : {
            provider: methodOption?.provider ?? 'stripe',
          };

      addPayment({
        method: 'credit',
        amount,
        metadata,
      });

      const nextRemaining = remaining - amount;
      resetDraft(nextRemaining);
      setError(null);

      if (Math.abs(nextRemaining) < 0.01) {
        setAutoCompletePending(true);
      }
    },
    [addPayment, methodOption?.provider, remaining]
  );

  const submitCardPayment = useCallback(async () => {
    if (!methodConfig) {
      setError('Select a payment method.');
      return;
    }

    if (cardProcessing) {
      return;
    }

    if (!cardReady) {
      setError('Card entry is still initializing. Please wait a moment.');
      return;
    }

    const amount = validateAmount();
    if (amount === null) return;

    const form = cardFormRef.current;
    if (!form) {
      setError('Card entry is unavailable. Try reselecting the payment method.');
      return;
    }

    const result = await form.submit();
    if (result.success && result.result) {
      handleCardComplete(amount, result.result);
    }
  }, [cardProcessing, cardReady, handleCardComplete, methodConfig, validateAmount]);

  const handleAddPayment = () => {
    if (!methodConfig) {
      setError('Select a payment method.');
      return;
    }

    if (baseMethodId === 'cash') {
      submitCashPayment();
      return;
    }

    if (baseMethodId === 'send_to_pos') {
      onConfirm([
        {
          method: 'send_to_pos',
          amount: total,
          metadata: {
            transferDate: new Date().toISOString(),
          },
        },
      ]);
      resetPayments();
      onClose();
      return;
    }

    const amount = validateAmount();
    if (amount === null) return;

    if (isOfflineMethod && requiresReference && referenceMissing) {
      setError(`${offlineReferenceLabel} is required.`);
      return;
    }

    const metadata: Record<string, any> = {};
    if (baseMethodId === 'house_account' || baseMethodId === 'check' || baseMethodId === 'cod') {
      if (referenceValue.trim()) {
        metadata.reference = referenceValue.trim();
      }
    }

    if (baseMethodId.startsWith('offline:')) {
      metadata.offlineMethodId = methodConfig.id?.split(':')[1];
      if (referenceValue.trim()) {
        metadata.reference = referenceValue.trim();
      }
    }

    addPayment({
      method: baseMethodId,
      amount,
      metadata,
    });

    const nextRemaining = Math.max(0, Number((remaining - amount).toFixed(2)));
    resetDraft(nextRemaining);
    setError(null);
    if (nextRemaining <= 0.01) {
      setAutoCompletePending(true);
    }
  };

  const handleComplete = useCallback(() => {
    if (remaining > 0.01) {
      setError('Payment total does not cover the order.');
      return;
    }
    setError(null);
    onConfirm(payments);
    resetPayments();
    onClose();
  }, [remaining, onConfirm, payments, resetPayments, onClose]);

  useEffect(() => {
    if (!autoCompletePending) return;
    if (cardProcessing) return;

    if (remaining <= 0.01 && (payments.length > 0 || giftCardDiscount > 0)) {
      handleComplete();
      setAutoCompletePending(false);
    }
  }, [autoCompletePending, cardProcessing, giftCardDiscount, handleComplete, payments.length, remaining]);

  useEffect(() => {
    if (!open) {
      setSelectedMethod('credit|stripe');
      setAmountInput(total.toFixed(2));
      setReferenceValue('');
      setError(null);
      setCardProcessing(false);
      setCardReady(false);
      setAutoCompletePending(false);
      cardFormRef.current = null;
      resetPayments();
      return;
    }
    resetDraft();
  }, [open, total, resetPayments]);

  const getPaymentLabel = (payment: PaymentEntry) => {
    if (payment.method === 'credit') {
      const provider = payment.metadata?.provider === 'square' ? 'Square' : 'Stripe';
      return `Credit Card (${provider})`;
    }

    if (payment.method === 'cash') {
      return 'Cash';
    }

    if (payment.method === 'send_to_pos') {
      return 'Send to POS';
    }

    const offlineMatch = availableMethods.find(
      (method) => method.baseId === payment.method && method.config.offlineId === payment.metadata?.offlineMethodId
    );
    if (offlineMatch) {
      return offlineMatch.label;
    }

    const match = availableMethods.find((method) => method.config.id === payment.method)
      || availableMethods.find((method) => method.baseId === payment.method);

    return match?.label ?? payment.method;
  };

  const paymentItems = [
    ...(giftCardDiscount > 0
      ? [
          {
            id: 'gift-card',
            label: 'Gift Card',
            amount: giftCardDiscount,
            meta:
              giftCardRedemptions.length > 0
                ? giftCardRedemptions.map((card) => `${card.cardNumber} - ${formatCurrency(card.amount)}`).join(', ')
                : undefined,
            onRemove: undefined,
          },
        ]
      : []),
    ...payments.map((payment, index) => ({
      id: `${payment.method}-${index}`,
      label: getPaymentLabel(payment),
      amount: payment.amount,
      meta:
        payment.metadata?.reference ||
        (payment.method === 'cash' && payment.metadata?.cashReceived
          ? `Received ${formatCurrency(payment.metadata.cashReceived)}${
              payment.metadata?.changeDue ? ` • Change ${formatCurrency(payment.metadata.changeDue)}` : ''
            }`
          : undefined),
      onRemove: () => removePayment(index),
    })),
  ];

  const primaryActionLabel = (() => {
    if (isCardMethod) {
      return `Process Card (${providerLabel})`;
    }

    if (baseMethodId === 'cash') {
      return coversRemaining ? 'Complete Payment' : 'Add Cash Payment';
    }

    if (isOfflineMethod) {
      return coversRemaining ? 'Complete Payment' : `Add ${methodOption?.label ?? 'Payment'}`;
    }

    if (remaining <= 0.01 && (payments.length > 0 || giftCardDiscount > 0)) {
      return 'Complete Payment';
    }

    if (methodOption?.baseId === 'gift_card') {
      return 'Apply Gift Card';
    }

    return 'Add Payment';
  })();

  const primaryAction = (() => {
    if (isCardMethod) {
      return submitCardPayment;
    }

    if (baseMethodId === 'cash') {
      return submitCashPayment;
    }

    if (remaining <= 0.01 && (payments.length > 0 || giftCardDiscount > 0)) {
      return handleComplete;
    }

    if (methodOption?.baseId === 'gift_card') {
      return () => {};
    }

    return handleAddPayment;
  })();

  return (
    <>
      <UnifiedPaymentModal
        open={open}
        title="Collect Payment"
        customerName={customerName}
        total={total}
        payments={paymentItems}
        remaining={remaining}
        paymentMethods={paymentMethodOptions}
        selectedMethod={methodOption?.value ?? ''}
        onSelectMethod={(value) => {
          setSelectedMethod(value);
          resetDraft();
          setError(null);
          setCardProcessing(false);
          setCardReady(false);
          setAutoCompletePending(false);
          cardFormRef.current = null;
        }}
        amountInput={amountInput}
        onAmountChange={setAmountInput}
        onAutofillAmount={() =>
          setAmountInput(Math.max(0, total - giftCardDiscount - manualPaymentsTotal).toFixed(2))
        }
        methodContent={
          baseMethodId === 'cash' ? (
            <CashMethodFields
              amountDue={remaining}
              amountInput={amountInput}
              onAmountChange={setAmountInput}
              onProcessCash={submitCashPayment}
              disabled={!hasValidCashAmount}
              showProcessButton={!coversRemaining}
            />
          ) : methodOption?.baseId === 'credit' ? (
            <CardMethodFields
              provider={methodOption.provider ?? 'stripe'}
              mode="manual"
              onProcessCard={submitCardPayment}
              disabled={cardProcessing || !cardReady || !hasValidCardAmount}
              note="Keyed entry for phone orders. Saved cards will appear once linked to the customer."
              showProcessButton={!coversRemaining}
            >
              <ManualCardEntry
                ref={assignCardForm}
                provider={methodOption.provider ?? 'stripe'}
                amount={manualEntryAmount}
                customerEmail={customer?.email ?? null}
                customerPhone={customer?.phone ?? null}
                customerName={customerName || null}
                onProcessingChange={setCardProcessing}
                onError={setError}
                onReadyChange={setCardReady}
              />
            </CardMethodFields>
          ) : methodOption?.baseId === 'gift_card' ? (
            <GiftCardInput
              onGiftCardChange={(amount, data) => {
                onGiftCardChange(amount, data ?? []);
                setAmountInput(Math.max(0, total - amount - manualPaymentsTotal).toFixed(2));
              }}
              grandTotal={total}
            />
          ) : (
            <OfflineMethodFields
              referenceLabel={offlineReferenceLabel}
              referenceValue={referenceValue}
              onReferenceChange={setReferenceValue}
              instructions={offlineMeta.instructions ?? methodConfig?.description}
              requireReference={requiresReference}
              onProcess={handleAddPayment}
              disabled={!hasValidOfflineAmount || referenceMissing}
              showProcessButton={!coversRemaining}
              processLabel={`Add ${methodOption?.label ?? 'Payment'}`}
            />
          )
        }
        quickActions={
          <>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Quick Actions
            </span>
            {quickActionButton('Print Receipt', quickActionsState.printReceipt, () => toggleQuickAction('printReceipt'))}
            {quickActionButton('Print Ticket', quickActionsState.printTicket, () => toggleQuickAction('printTicket'))}
            {quickActionButton('Email Receipt', quickActionsState.emailReceipt, () => toggleQuickAction('emailReceipt'))}
          </>
        }
        error={error}
        isProcessing={cardProcessing}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={primaryAction}
        primaryDisabled={
          (isCardMethod && (!hasValidCardAmount || cardProcessing || !cardReady)) ||
          (baseMethodId === 'cash' && !hasValidCashAmount) ||
          (isOfflineMethod && (!hasValidOfflineAmount || referenceMissing)) ||
          (!isCardMethod && remaining <= 0.01 && payments.length === 0 && giftCardDiscount <= 0) ||
          methodOption?.baseId === 'gift_card'
        }
        onClose={() => {
          setError(null);
          onClose();
        }}
      />
    </>
  );
};

export default TakeOrderUnifiedPaymentModal;
