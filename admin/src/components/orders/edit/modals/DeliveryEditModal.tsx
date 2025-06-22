import React from 'react';
import { SaveIcon } from '../../../../icons';
import Label from '../../../form/Label';
import DeliveryDatePicker from '../../../form/DeliveryDatePicker';

interface DeliveryEditModalProps {
  delivery: {
    deliveryDate: string;
    deliveryTime: string;
    cardMessage: string;
    specialInstructions: string;
    occasion: string;
    deliveryFee: number;
  };
  onChange: (delivery: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const DeliveryEditModal: React.FC<DeliveryEditModalProps> = ({
  delivery,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <DeliveryDatePicker
            id="delivery-edit-date-picker"
            label="Delivery Date"
            placeholder="Select delivery date"
            value={delivery.deliveryDate}
            onChange={(date) => onChange({ ...delivery, deliveryDate: date })}
          />
        </div>
        <div>
          <Label>Delivery Time</Label>
          <input
            type="text"
            value={delivery.deliveryTime}
            onChange={(e) => onChange({ ...delivery, deliveryTime: e.target.value })}
            placeholder="e.g., 2:00 PM - 4:00 PM"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <Label>Occasion</Label>
        <input
          type="text"
          value={delivery.occasion}
          onChange={(e) => onChange({ ...delivery, occasion: e.target.value })}
          placeholder="e.g., Birthday, Anniversary, Sympathy"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Card Message</Label>
        <textarea
          value={delivery.cardMessage}
          onChange={(e) => onChange({ ...delivery, cardMessage: e.target.value })}
          placeholder="Message for the card"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Special Instructions</Label>
        <textarea
          value={delivery.specialInstructions}
          onChange={(e) => onChange({ ...delivery, specialInstructions: e.target.value })}
          placeholder="Delivery instructions"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Delivery Fee ($)</Label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={delivery.deliveryFee}
          onChange={(e) => onChange({ ...delivery, deliveryFee: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
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

export default DeliveryEditModal;