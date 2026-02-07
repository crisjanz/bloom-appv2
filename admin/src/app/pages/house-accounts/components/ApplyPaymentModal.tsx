import { useEffect, useState } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import TextArea from '@shared/ui/forms/input/TextArea';
import FormError from '@shared/ui/components/ui/form/FormError';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import { parseUserCurrency } from '@shared/utils/currency';

interface ApplyPaymentModalProps {
  isOpen: boolean;
  customerName?: string;
  onClose: () => void;
  onSubmit: (payload: { amount: number; reference?: string; notes?: string }) => Promise<void>;
}

export default function ApplyPaymentModal({ isOpen, customerName, onClose, onSubmit }: ApplyPaymentModalProps) {
  const [amountInput, setAmountInput] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAmountInput('');
    setReference('');
    setNotes('');
    setSubmitting(false);
    setError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    const amount = parseUserCurrency(amountInput || '');
    if (!amount || amount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        amount,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to apply payment:', err);
      setError(err?.message || 'Failed to apply payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Apply Payment</h2>
          {customerName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{customerName}</p>
          )}
        </div>

        <FormError error={error} />

        <InputField
          label="Amount (dollars)"
          type="text"
          placeholder="0.00"
          value={amountInput || ''}
          onChange={(event) => setAmountInput(event.target.value)}
        />

        <InputField
          label="Reference"
          type="text"
          placeholder="Check #1234"
          value={reference || ''}
          onChange={(event) => setReference(event.target.value)}
        />

        <TextArea
          label="Notes"
          placeholder="Optional notes"
          rows={3}
          value={notes || ''}
          onChange={(value) => setNotes(value)}
        />

        <FormFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitText="Apply Payment"
          submitIcon={<SaveIcon className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}
