import React from 'react';
import { SaveIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import Label from '@shared/ui/forms/Label';
import DeliveryDatePicker from '@shared/ui/forms/DeliveryDatePicker';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import { centsToDollars, parseUserCurrency } from '@shared/utils/currency';

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
  const deliveryFeeDisplay = Number.isFinite(delivery.deliveryFee)
    ? centsToDollars(delivery.deliveryFee).toFixed(2)
    : '';

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
            allowPastDates
          />
        </div>
        <InputField
          label="Delivery Time"
          type="text"
          value={delivery.deliveryTime || ''}
          onChange={(e) => onChange({ ...delivery, deliveryTime: e.target.value })}
          placeholder="e.g., 2:00 PM - 4:00 PM"
        />
      </div>

      <InputField
        label="Occasion"
        type="text"
        value={delivery.occasion || ''}
        onChange={(e) => onChange({ ...delivery, occasion: e.target.value })}
        placeholder="e.g., Birthday, Anniversary, Sympathy"
      />

      <div>
        <Label>Card Message</Label>
        <div className="flex flex-wrap gap-1 mb-1">
          {['♥', '♡', '★', '☆', '✿', '❀', '♪', '•', '~'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => onChange({ ...delivery, cardMessage: (delivery.cardMessage || '') + sym })}
              className="w-7 h-7 text-sm rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {sym}
            </button>
          ))}
        </div>
        <textarea
          value={delivery.cardMessage || ''}
          onChange={(e) => onChange({ ...delivery, cardMessage: e.target.value })}
          placeholder="Message for the card"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Special Instructions</Label>
        <textarea
          value={delivery.specialInstructions || ''}
          onChange={(e) => onChange({ ...delivery, specialInstructions: e.target.value })}
          placeholder="Delivery instructions"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <InputField
        label="Delivery Fee ($)"
        type="number"
        step="0.01"
        min="0"
        value={deliveryFeeDisplay || ''}
        onChange={(e) => onChange({ ...delivery, deliveryFee: parseUserCurrency(e.target.value) })}
      />

      <FormFooter
        onCancel={onCancel}
        onSubmit={onSave}
        submitting={saving}
        submitIcon={<SaveIcon className="w-4 h-4" />}
      />
    </div>
  );
};

export default DeliveryEditModal;
