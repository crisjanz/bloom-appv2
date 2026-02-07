import { useEffect, useState } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import TextArea from '@shared/ui/forms/input/TextArea';
import FormError from '@shared/ui/components/ui/form/FormError';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import { parseUserCurrency } from '@shared/utils/currency';

interface AddAdjustmentModalProps {
  isOpen: boolean;
  customerName?: string;
  onClose: () => void;
  onSubmit: (payload: { amount: number; description: string }) => Promise<void>;
}

export default function AddAdjustmentModal({
  isOpen,
  customerName,
  onClose,
  onSubmit,
}: AddAdjustmentModalProps) {
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAmountInput('');
    setDescription('');
    setSubmitting(false);
    setError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    const amount = parseUserCurrency(amountInput || '');
    if (!amount || amount === 0) {
      setError('Enter a non-zero adjustment amount.');
      return;
    }

    if (!description.trim()) {
      setError('Provide a description for this adjustment.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        amount,
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to add adjustment:', err);
      setError(err?.message || 'Failed to add adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Adjustment</h2>
          {customerName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{customerName}</p>
          )}
        </div>

        <FormError error={error} />

        <InputField
          label="Amount (dollars)"
          type="text"
          placeholder="Use negative to reduce balance"
          value={amountInput || ''}
          onChange={(event) => setAmountInput(event.target.value)}
        />

        <TextArea
          label="Description"
          placeholder="Write-off, correction, opening balance, etc."
          rows={3}
          value={description || ''}
          onChange={(value) => setDescription(value)}
        />

        <FormFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitText="Add Adjustment"
          submitIcon={<SaveIcon className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}
