import React from 'react';
import { formatCurrency } from '@shared/utils/currency';

interface Props {
  customerName: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  style: 'DESIGNERS_CHOICE' | 'PICK_YOUR_OWN';
  planName?: string;
  colorPalette?: string | null;
  frequency: string;
  preferredDayOfWeek: number | null;
  startDate: string;
  billingType: 'RECURRING' | 'PREPAID';
  defaultPriceCents: number;
  totalDeliveries: number | null;
  deliveryProducts: { scheduledDate: string; productName: string | null; priceCents: number }[];
  notes: string;
  onNotesChange: (notes: string) => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ReviewStep(props: Props) {
  const totalPrepaidCents = props.deliveryProducts.length > 0
    ? props.deliveryProducts.reduce((sum, dp) => sum + dp.priceCents, 0)
    : (props.defaultPriceCents * (props.totalDeliveries || 0));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Step 6: Review</h3>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Customer</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{props.customerName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Recipient</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{props.recipientName}</div>
            <div className="text-xs text-gray-500">{props.recipientAddress}, {props.recipientCity} {props.recipientPostalCode}</div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Style</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {props.style === 'DESIGNERS_CHOICE' ? "Designer's Choice" : 'Pick Your Arrangements'}
              {props.planName && ` — ${props.planName}`}
            </div>
            {props.colorPalette && (
              <div className="text-xs text-gray-500">Color: {props.colorPalette}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Schedule</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {props.frequency.charAt(0) + props.frequency.slice(1).toLowerCase()}
              {props.preferredDayOfWeek !== null && ` — ${DAY_NAMES[props.preferredDayOfWeek]}s`}
            </div>
            <div className="text-xs text-gray-500">
              Starting {new Date(props.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Billing</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type:</span>
            <span className="text-gray-900 dark:text-white">{props.billingType === 'RECURRING' ? 'Recurring' : 'Prepaid'}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Per delivery:</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(props.defaultPriceCents)}</span>
          </div>
          {props.billingType === 'PREPAID' && props.totalDeliveries && (
            <>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Deliveries:</span>
                <span className="text-gray-900 dark:text-white">{props.totalDeliveries}</span>
              </div>
              <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total prepaid:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totalPrepaidCents)}</span>
              </div>
            </>
          )}
        </div>

        {/* Per-delivery products breakdown */}
        {props.deliveryProducts.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Delivery Schedule</div>
            {props.deliveryProducts.map((dp, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-gray-500">
                  {new Date(dp.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {dp.productName && ` — ${dp.productName}`}
                </span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(dp.priceCents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
        <textarea
          value={props.notes || ''}
          onChange={(e) => props.onNotesChange(e.target.value)}
          rows={2}
          placeholder="Admin notes (not visible to customer)"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}
