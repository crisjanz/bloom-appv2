import { useEffect, useMemo, useState } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import FormError from '@shared/ui/components/ui/form/FormError';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import type { InventoryItem } from '@shared/hooks/useInventory';

type PrintLabelsModalProps = {
  isOpen: boolean;
  selectedItems: InventoryItem[];
  onClose: () => void;
  onGenerate: (labels: Array<{ variantId: string; quantity: number }>) => Promise<void>;
};

export default function PrintLabelsModal({
  isOpen,
  selectedItems,
  onClose,
  onGenerate,
}: PrintLabelsModalProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextQuantities: Record<string, string> = {};
    selectedItems.forEach((item) => {
      nextQuantities[item.variantId] = '1';
    });
    setQuantities(nextQuantities);
    setSubmitting(false);
    setError(null);
  }, [isOpen, selectedItems]);

  const totalLabels = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const value = Number.parseInt(quantities[item.variantId] || '0', 10);
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
  }, [quantities, selectedItems]);

  const handleQuantityChange = (variantId: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: value,
    }));
  };

  const handleGenerate = async () => {
    if (selectedItems.length === 0) {
      setError('Select at least one item from the table before printing labels.');
      return;
    }

    const labels = selectedItems
      .map((item) => {
        const parsed = Number.parseInt(quantities[item.variantId] || '0', 10);
        return {
          variantId: item.variantId,
          quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
        };
      })
      .filter((label) => label.quantity > 0);

    if (labels.length === 0) {
      setError('Add a quantity of at least 1 for one or more items.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onGenerate(labels);
      onClose();
    } catch (err: any) {
      console.error('Failed to generate labels:', err);
      setError(err?.message || 'Failed to generate labels');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Print Price Labels</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select quantities for each item and generate a label PDF.
          </p>
        </div>

        <FormError error={error} />

        {selectedItems.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
            No inventory items selected. Close this modal, select rows in the table, then try again.
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {selectedItems.map((item) => (
              <div
                key={item.variantId}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.productName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.variantName} | {item.sku}
                  </div>
                </div>
                <InputField
                  label="Qty"
                  type="number"
                  min="1"
                  value={quantities[item.variantId] || ''}
                  onChange={(event) => handleQuantityChange(item.variantId, event.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          Total labels: <span className="font-semibold">{totalLabels}</span>
        </div>

        <FormFooter
          onCancel={onClose}
          onSubmit={handleGenerate}
          submitting={submitting}
          submitText="Generate Labels"
          submitIcon={<SaveIcon className="w-4 h-4" />}
          submitDisabled={selectedItems.length === 0}
        />
      </div>
    </Modal>
  );
}
