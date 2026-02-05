import { useEffect, useState } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import FormError from '@shared/ui/components/ui/form/FormError';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import type { InventoryItem } from '@shared/hooks/useInventory';

type QuickAdjustModalProps = {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (variantId: string, stockLevel: number) => Promise<void>;
};

export default function QuickAdjustModal({ isOpen, item, onClose, onSave }: QuickAdjustModalProps) {
  const [stockInput, setStockInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    setStockInput(String(item.stockLevel ?? 0));
    setSubmitting(false);
    setError(null);
  }, [isOpen, item]);

  const applyDelta = (delta: number) => {
    const current = Number.parseInt(stockInput || '0', 10);
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
    setStockInput(String(next));
  };

  const handleSave = async () => {
    if (!item) return;

    const parsed = Number.parseInt(stockInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid stock quantity (0 or greater).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave(item.variantId, parsed);
      onClose();
    } catch (err: any) {
      console.error('Failed to save stock adjustment:', err);
      setError(err?.message || 'Failed to save stock adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Adjust Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.productName} ({item.sku})
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-1">
          <div className="text-sm text-gray-500 dark:text-gray-400">Variant</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{item.variantName}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Current stock: <span className="font-semibold text-gray-900 dark:text-white">{item.stockLevel ?? 0}</span>
          </div>
        </div>

        <FormError error={error} />

        <InputField
          label="New Stock Level"
          type="number"
          min="0"
          value={stockInput || ''}
          onChange={(event) => setStockInput(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => applyDelta(-1)}
            className="h-11 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => applyDelta(1)}
            className="h-11 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          >
            +1
          </button>
        </div>

        <FormFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitting={submitting}
          submitText="Save Stock"
          submitIcon={<SaveIcon className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}
