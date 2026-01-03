// Create components/pos/payment/DiscountModal.tsx
import { FC, useState } from "react";
import { Modal } from '@shared/ui/components/ui/modal';

type Props = {
  open: boolean;
  onApply: (discount: {type: string, amount: number, description: string}) => void;
  onCancel: () => void;
};

const DiscountModal: FC<Props> = ({ open, onApply, onCancel }) => {
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');

  const handleApply = () => {
    const value = parseFloat(discountValue);
    if (!value || value <= 0) return;

    onApply({
      type: discountType,
      amount: value,
      description: `${discountType === 'percent' ? value + '%' : '$' + value} Discount${reason ? ' - ' + reason : ''}`
    });

    setDiscountValue('');
    setReason('');
  };

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      className="max-w-md"
    >
      <div className="p-6">
        <h2 className="text-xl font-bold text-black dark:text-white mb-4">Add Discount</h2>
        
        <div className="space-y-4">
          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Discount Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  discountType === 'percent' 
                    ? 'bg-brand-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscountType('amount')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  discountType === 'amount' 
                    ? 'bg-brand-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Fixed Amount ($)
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              {discountType === 'percent' ? 'Percentage' : 'Amount'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                {discountType === 'percent' ? '%' : '$'}
              </span>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white"
                placeholder={discountType === 'percent' ? '10' : '5.00'}
                min="0"
                step={discountType === 'percent' ? '1' : '0.01'}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-2">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white"
              placeholder="Staff discount, damage, etc."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!discountValue || parseFloat(discountValue) <= 0}
            className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DiscountModal;