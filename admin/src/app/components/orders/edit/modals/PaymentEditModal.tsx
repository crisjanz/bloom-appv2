import React from 'react';
import { SaveIcon } from '@shared/assets/icons';
import Label from '@shared/ui/forms/Label';

interface PaymentEditModalProps {
  payment: {
    deliveryFee: number;
    discount: number;
    gst: number;
    pst: number;
  };
  onChange: (payment: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  payment,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Delivery Fee ($)</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={(payment.deliveryFee / 100).toFixed(2)}
            onChange={(e) => onChange({ ...payment, deliveryFee: Math.round((parseFloat(e.target.value || '0')) * 100) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <Label>Discount ($)</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={(payment.discount / 100).toFixed(2)}
            onChange={(e) => onChange({ ...payment, discount: Math.round((parseFloat(e.target.value || '0')) * 100) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>GST ($)</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={payment.gst.toFixed(2)}
            onChange={(e) => onChange({ ...payment, gst: parseFloat(e.target.value || '0') })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <Label>PST ($)</Label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={payment.pst.toFixed(2)}
            onChange={(e) => onChange({ ...payment, pst: parseFloat(e.target.value || '0') })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Changing these values will recalculate the order total.
        </p>
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentEditModal;