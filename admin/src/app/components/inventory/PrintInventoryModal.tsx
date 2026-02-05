import { useEffect, useMemo, useState } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import { Modal } from '@shared/ui/components/ui/modal';
import Select from '@shared/ui/forms/Select';
import FormError from '@shared/ui/components/ui/form/FormError';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import type { InventoryCategory } from '@shared/hooks/useInventory';

type PrintInventoryModalProps = {
  isOpen: boolean;
  categories: InventoryCategory[];
  onClose: () => void;
  onGenerate: (options: {
    categoryId?: string;
    lowStockOnly?: boolean;
    sortBy?: 'name' | 'sku' | 'stock';
    sortOrder?: 'asc' | 'desc';
  }) => Promise<void>;
};

export default function PrintInventoryModal({
  isOpen,
  categories,
  onClose,
  onGenerate,
}: PrintInventoryModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState('false');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCategoryId('');
    setLowStockOnly('false');
    setSortBy('name');
    setSortOrder('asc');
    setSubmitting(false);
    setError(null);
  }, [isOpen]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories' },
      ...categories.map((category) => ({
        value: category.id,
        label: category.depth ? `${'-- '.repeat(category.depth)}${category.name}` : category.name,
      })),
    ],
    [categories]
  );

  const handleGenerate = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onGenerate({
        categoryId: categoryId || undefined,
        lowStockOnly: lowStockOnly === 'true',
        sortBy,
        sortOrder,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to generate inventory report:', err);
      setError(err?.message || 'Failed to generate inventory report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Print Inventory Count Sheet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose filters and generate a printable PDF for manual counts.
          </p>
        </div>

        <FormError error={error} />

        <div className="space-y-4">
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryId || ''}
            onChange={setCategoryId}
            placeholder="Select category"
          />

          <Select
            label="Stock Filter"
            options={[
              { value: 'false', label: 'All Inventory' },
              { value: 'true', label: 'Low Stock Only' },
            ]}
            value={lowStockOnly || ''}
            onChange={setLowStockOnly}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Sort By"
              options={[
                { value: 'name', label: 'Product Name' },
                { value: 'sku', label: 'SKU' },
                { value: 'stock', label: 'Stock Level' },
              ]}
              value={sortBy}
              onChange={(value) => setSortBy((value as 'name' | 'sku' | 'stock') || 'name')}
            />

            <Select
              label="Sort Order"
              options={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
              ]}
              value={sortOrder}
              onChange={(value) => setSortOrder((value as 'asc' | 'desc') || 'asc')}
            />
          </div>
        </div>

        <FormFooter
          onCancel={onClose}
          onSubmit={handleGenerate}
          submitting={submitting}
          submitText="Generate PDF"
          submitIcon={<SaveIcon className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}
