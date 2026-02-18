import React from 'react';
import InputField from '@shared/ui/forms/input/InputField';

type BillingType = 'RECURRING' | 'PREPAID';

interface BillingData {
  billingType: BillingType;
  totalDeliveries: number | null;
  stripePaymentMethodId: string | null;
  stripeCustomerId: string | null;
}

interface Props {
  data: BillingData;
  onChange: (data: BillingData) => void;
  pricePerDelivery: number; // in cents
}

export default function BillingStep({ data, onChange, pricePerDelivery }: Props) {
  const update = (field: keyof BillingData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const totalPrepaid = data.totalDeliveries
    ? (pricePerDelivery * data.totalDeliveries) / 100
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Step 4: Billing</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">How should this subscription be billed?</p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => update('billingType', 'RECURRING')}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            data.billingType === 'RECURRING'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-gray-900 dark:text-white">Recurring</div>
          <div className="text-xs text-gray-500 mt-1">Charge card each delivery</div>
        </button>
        <button
          type="button"
          onClick={() => update('billingType', 'PREPAID')}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            data.billingType === 'PREPAID'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-gray-900 dark:text-white">Prepaid</div>
          <div className="text-xs text-gray-500 mt-1">Pay upfront for all deliveries</div>
        </button>
      </div>

      {data.billingType === 'PREPAID' && (
        <div className="space-y-3">
          <InputField
            label="Number of Deliveries"
            type="number"
            value={data.totalDeliveries !== null ? String(data.totalDeliveries) : ''}
            onChange={(e) => update('totalDeliveries', parseInt(e.target.value) || null)}
            placeholder="e.g. 12"
          />
          {data.totalDeliveries && data.totalDeliveries > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Price per delivery:</span>
                <span className="text-gray-900 dark:text-white">${(pricePerDelivery / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Number of deliveries:</span>
                <span className="text-gray-900 dark:text-white">{data.totalDeliveries}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-900 dark:text-white">Total prepaid:</span>
                  <span className="text-gray-900 dark:text-white">${totalPrepaid.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        {data.billingType === 'RECURRING'
          ? 'The customer\'s card will be charged automatically before each delivery. Card will be saved when payment is processed at the POS terminal.'
          : 'The full amount will be charged at the POS terminal. No further charges will be made.'}
      </div>
    </div>
  );
}
