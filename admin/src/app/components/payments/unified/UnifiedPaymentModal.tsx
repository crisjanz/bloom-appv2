import { ReactNode } from 'react';
import Button from '@shared/ui/components/ui/button/Button';
import Select from '@shared/ui/forms/Select';
import InputField from '@shared/ui/forms/input/InputField';
import { formatCurrency } from '@shared/utils/currency';

export interface UnifiedPaymentItem {
  id: string;
  label: string;
  amount: number;
  meta?: ReactNode;
  onRemove?: () => void;
}

export interface UnifiedPaymentMethodOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface UnifiedPaymentModalProps {
  open: boolean;
  title?: string;
  customerName?: string;
  total: number;
  payments: UnifiedPaymentItem[];
  remaining: number;
  paymentMethods: UnifiedPaymentMethodOption[];
  selectedMethod: string;
  onSelectMethod: (value: string) => void;
  amountInput: string;
  onAmountChange: (value: string) => void;
  onAutofillAmount: () => void;
  methodContent?: ReactNode;
  quickActions?: ReactNode;
  summaryFooter?: ReactNode;
  error?: string | null;
  isProcessing?: boolean;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryDisabled?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onClose: () => void;
}

const UnifiedPaymentModal = ({
  open,
  title = 'Collect Payment',
  customerName,
  total,
  payments,
  remaining,
  paymentMethods,
  selectedMethod,
  onSelectMethod,
  amountInput,
  onAmountChange,
  onAutofillAmount,
  methodContent,
  quickActions,
  summaryFooter,
  error,
  isProcessing,
  primaryActionLabel,
  onPrimaryAction,
  primaryDisabled,
  secondaryActionLabel = 'Cancel',
  onSecondaryAction,
  onClose,
}: UnifiedPaymentModalProps) => {
  if (!open) return null;

  const appliedTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100000] p-2 sm:p-4">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-[68rem] max-h-[90vh] overflow-y-auto">
        <div className="border-b border-stroke dark:border-strokedark px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-black dark:text-white">{title}</h2>
            {customerName && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Customer: {customerName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close payment modal"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 sm:gap-6 p-4 sm:p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Order Total</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Payments Added</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(appliedTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Remaining Balance</span>
                <span className="font-semibold text-brand-500">{formatCurrency(Math.max(0, remaining))}</span>
              </div>
              {isProcessing && (
                <div className="text-sm text-brand-500">Processing payment…</div>
              )}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payments Added</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{payments.length}</span>
              </div>
              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No payments yet. Select a method to add one.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{payment.label}</div>
                        {payment.meta && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{payment.meta}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-brand-500">{formatCurrency(payment.amount)}</span>
                        {payment.onRemove && (
                          <button
                            onClick={payment.onRemove}
                            className="text-xs text-red-500 hover:text-red-600"
                            aria-label={`Remove ${payment.label}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {summaryFooter}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Payment Method
                  </label>
                  <Select
                    options={paymentMethods}
                    value={selectedMethod}
                    onChange={onSelectMethod}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Payment Amount
                  </label>
                  <div className="flex items-center gap-3">
                    <InputField
                      type="number"
                      step={0.01}
                      min="0"
                      value={amountInput}
                      onChange={(event) => onAmountChange(event.target.value)}
                    />
                    <button
                      onClick={onAutofillAmount}
                      className="text-xs font-medium text-brand-500 hover:text-brand-600"
                    >
                      Autofill
                    </button>
                  </div>
                </div>
              </div>

              {methodContent}
            </div>
          </div>
        </div>

        <div className="border-t border-stroke dark:border-strokedark px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {quickActions && (
              <div className="flex flex-wrap items-center gap-3">
                {quickActions}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onSecondaryAction ?? onClose}>
                {secondaryActionLabel}
              </Button>
              <Button onClick={onPrimaryAction} disabled={primaryDisabled || isProcessing}>
                {primaryActionLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedPaymentModal;
