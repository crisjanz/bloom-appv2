import { useEffect, useState } from 'react';
import InputField from '@shared/ui/forms/input/InputField';
import Button from '@shared/ui/components/ui/button/Button';

interface ManualPaymentModalProps {
  open: boolean;
  methodLabel: string;
  defaultAmount: number;
  requireReference?: boolean;
  referenceLabel?: string;
  instructions?: string;
  onSubmit: (data: { amount: number; reference?: string }) => void;
  onCancel: () => void;
}

const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  open,
  methodLabel,
  defaultAmount,
  requireReference = false,
  referenceLabel = 'Reference',
  instructions,
  onSubmit,
  onCancel,
}) => {
  const [amount, setAmount] = useState<string>(defaultAmount.toFixed(2));
  const [reference, setReference] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(defaultAmount.toFixed(2));
    setReference('');
    setError(null);
  }, [open, defaultAmount]);

  if (!open) return null;

  const handleSubmit = () => {
    const parsedAmount = defaultAmount;
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (requireReference && reference.trim().length === 0) {
      setError(`Enter a ${referenceLabel.toLowerCase()}.`);
      return;
    }

    setError(null);
    onSubmit({
      amount: parsedAmount,
      reference: reference.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white">{methodLabel} Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <InputField
            label="Amount"
            type="number"
            step={0.01}
            min="0"
            value={amount}
            disabled
          />

          {requireReference && (
            <InputField
              label={referenceLabel}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          )}

          {!requireReference && (
            <InputField
              label={`${referenceLabel} (optional)`}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          )}

          {instructions && (
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
              {instructions}
            </p>
          )}

          {error && (
            <div className="text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Confirm Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualPaymentModal;
