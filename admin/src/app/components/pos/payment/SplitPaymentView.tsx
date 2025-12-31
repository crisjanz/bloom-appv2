// components/pos/payment/SplitPaymentView.tsx
import { FC } from 'react';
import Select from '@shared/ui/forms/Select';

export type SplitPaymentTender =
  | 'cash'
  | 'card_square'
  | 'card_stripe'
  | 'house_account'
  | 'cod'
  | 'check';

export type SplitPaymentRow = {
  id: string;
  tender: SplitPaymentTender;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  details?: string;
};

type Props = {
  total: number;
  rows: SplitPaymentRow[];
  remaining: number;
  onBack: () => void;
  onChangeTender: (rowId: string, tender: SplitPaymentTender) => void;
  onChangeAmount: (rowId: string, amount: number) => void;
  onPayRow: (rowId: string) => void;
  onAddRow: () => void;
};

const tenderOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'card_square', label: 'Square Card' },
  { value: 'card_stripe', label: 'Stripe Card' },
  { value: 'house_account', label: 'House Account' },
  { value: 'cod', label: 'COD' },
  { value: 'check', label: 'Check' },
];

const renderStatus = (status: SplitPaymentRow['status']) => {
  if (status === 'completed') return 'Paid';
  if (status === 'processing') return 'Processing…';
  return 'Pending';
};

const statusBadge = (status: SplitPaymentRow['status']) => {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'processing') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
};

const SplitPaymentView: FC<Props> = ({
  total,
  rows,
  remaining,
  onBack,
  onChangeTender,
  onChangeAmount,
  onPayRow,
  onAddRow,
}) => {
  const completedCount = rows.filter((row) => row.status === 'completed').length;
  const totalRows = rows.length;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between px-6 py-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-brand-500 transition hover:text-brand-600"
          >
            ← Back to payment tiles
          </button>
          <h2 className="mt-2 text-2xl font-semibold text-black dark:text-white">Split Payment</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Capture the balance across multiple tenders. Rows lock once paid.
          </p>
        </div>
        <div className="rounded-xl bg-transparent px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-200">
          Progress: {completedCount} / {totalRows} paid
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 pb-8 dark:bg-gray-900">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-transparent p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Order Total
            </span>
            <div className="mt-1 text-2xl font-bold text-black dark:text-white">${total.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl bg-transparent p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Remaining Balance
            </span>
            <div
              className={`mt-1 text-2xl font-bold ${
                remaining > 0.01 ? 'text-brand-500' : 'text-green-600 dark:text-green-400'
              }`}
            >
              ${remaining.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-boxdark"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    #{index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <Select
                      options={tenderOptions}
                      value={row.tender}
                      placeholder="Select payment method"
                      onChange={(value) => onChangeTender(row.id, value as SplitPaymentTender)}
                      disabled={row.status !== 'pending'}
                    />
                    {row.details && row.status === 'completed' && (
                      <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {row.details}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number.isFinite(row.amount) ? row.amount.toFixed(2) : ''}
                      onChange={(event) => onChangeAmount(row.id, parseFloat(event.target.value) || 0)}
                      disabled={row.status !== 'pending'}
                      className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(row.status)}`}
                    >
                      {renderStatus(row.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPayRow(row.id)}
                      disabled={row.status !== 'pending'}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                        row.status === 'pending'
                          ? 'bg-brand-500 hover:bg-brand-600'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {row.status === 'processing' ? 'Processing…' : row.status === 'completed' ? 'Paid' : 'Pay'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onAddRow}
            disabled={remaining <= 0.01}
            className="rounded-lg border border-dashed border-gray-400 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-500 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Add Split Row
          </button>
          {remaining <= 0.01 && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
              All payments captured. Finalizing when remaining rows complete.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentView;
