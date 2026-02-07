import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import DatePicker from '@shared/ui/forms/date-picker';
import FormError from '@shared/ui/components/ui/form/FormError';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { DownloadIcon } from '@shared/assets/icons';
import { formatCurrency } from '@shared/utils/currency';
import { getMonthRange } from '@app/components/reports/dateUtils';
import { useApiClient } from '@shared/hooks/useApiClient';
import useHouseAccounts, { HouseAccountStatement } from '@shared/hooks/useHouseAccounts';

interface ChargeRow {
  id: string;
  date: string;
  orderId: string | null;
  orderNumber: number | null;
  description: string;
  reference: string | null;
  amount: number;
}

interface PaymentRow {
  id: string;
  date: string;
  reference: string | null;
  description: string;
  amount: number;
}

interface AdjustmentRow {
  id: string;
  date: string;
  description: string;
  amount: number;
}

const formatSignedCurrency = (amount: number) => {
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
};

const formatBalance = (amount: number) => {
  if (amount < 0) {
    return `-${formatCurrency(Math.abs(amount))}`;
  }
  return formatCurrency(amount);
};

const formatDate = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-CA');
};

export default function HouseAccountStatementPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const apiClient = useApiClient();
  const { getStatement } = useHouseAccounts();

  const defaultRange = useMemo(() => getMonthRange(), []);
  const [fromDate, setFromDate] = useState(defaultRange.start);
  const [toDate, setToDate] = useState(defaultRange.end);

  const [statement, setStatement] = useState<HouseAccountStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);

  const loadStatement = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getStatement(customerId, {
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setStatement(data);
    } catch (err: any) {
      console.error('Failed to load statement:', err);
      setError(err?.message || 'Failed to load statement');
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, getStatement, toDate]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const handlePrint = async () => {
    if (!customerId) return;
    setPrintError(null);
    setPrintSuccess(null);
    setPrintLoading(true);

    try {
      const { data, status } = await apiClient.post('/api/print/house-account-statement', {
        customerId,
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      if (status >= 400) {
        throw new Error(data?.error || 'Print request failed');
      }

      if (data?.action === 'browser-print' && data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
        setPrintSuccess('Statement PDF opened in a new tab.');
      } else if (data?.action === 'queued') {
        setPrintSuccess('Statement queued for printing.');
      } else if (data?.action === 'skipped') {
        setPrintError('Printing is disabled for documents.');
      } else {
        setPrintSuccess('Statement queued for printing.');
      }
    } catch (err) {
      console.error('Failed to print statement:', err);
      setPrintError(err instanceof Error ? err.message : 'Failed to print statement');
    } finally {
      setPrintLoading(false);
    }
  };

  const charges = statement?.charges || [];
  const payments = statement?.payments || [];
  const adjustments = statement?.adjustments || [];

  const chargeRows: ChargeRow[] = charges.map((entry, index) => ({
    id: `charge-${index}`,
    ...entry,
  }));
  const paymentRows: PaymentRow[] = payments.map((entry, index) => ({
    id: `payment-${index}`,
    ...entry,
  }));
  const adjustmentRows: AdjustmentRow[] = adjustments.map((entry, index) => ({
    id: `adjustment-${index}`,
    ...entry,
  }));

  const chargeColumns: ColumnDef<ChargeRow>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'min-w-[120px]',
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(row.date)}</span>,
    },
    {
      key: 'order',
      header: 'Order #',
      className: 'min-w-[120px]',
      render: (row) => (
        row.orderNumber ? (
          row.orderId ? (
            <Link
              to={`/orders/${row.orderId}`}
              className="text-sm text-brand-500 hover:text-brand-600"
            >
              #{row.orderNumber}
            </Link>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-400">#{row.orderNumber}</span>
          )
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      className: 'min-w-[160px]',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{row.reference || '—'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'min-w-[240px]',
      render: (row) => <span className="text-sm text-gray-700 dark:text-gray-300">{row.description}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'min-w-[120px] text-right',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatSignedCurrency(row.amount)}
        </span>
      ),
    },
  ];

  const paymentColumns: ColumnDef<PaymentRow>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'min-w-[120px]',
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(row.date)}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      className: 'min-w-[160px]',
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.reference || '—'}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      className: 'min-w-[240px]',
      render: (row) => <span className="text-sm text-gray-700 dark:text-gray-300">{row.description}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'min-w-[120px] text-right',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatSignedCurrency(row.amount)}
        </span>
      ),
    },
  ];

  const adjustmentColumns: ColumnDef<AdjustmentRow>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'min-w-[120px]',
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(row.date)}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      className: 'min-w-[240px]',
      render: (row) => <span className="text-sm text-gray-700 dark:text-gray-300">{row.description}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'min-w-[120px] text-right',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatSignedCurrency(row.amount)}
        </span>
      ),
    },
  ];

  const totalCharges = charges.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalPayments = payments.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalAdjustments = adjustments.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const customerName = statement
    ? `${statement.customer.firstName} ${statement.customer.lastName}`.trim()
    : '';

  return (
    <div className="p-6 space-y-6">
      <PageBreadcrumb />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">House Account Statement</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Printable statement for house account activity.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={customerId ? `/house-accounts/${customerId}` : '/house-accounts'}
          className="text-sm text-brand-500 hover:text-brand-600"
        >
          Back to account
        </Link>
      </div>

      <ComponentCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              id="house-statement-from"
              label="From"
              placeholder="Start date"
              defaultDate={fromDate || undefined}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  const date = selectedDates[0];
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFromDate(`${year}-${month}-${day}`);
                }
              }}
            />

            <DatePicker
              id="house-statement-to"
              label="To"
              placeholder="End date"
              defaultDate={toDate || undefined}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  const date = selectedDates[0];
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setToDate(`${year}-${month}-${day}`);
                }
              }}
            />
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!statement || loading || printLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="h-4 w-4" />
            {printLoading ? 'Printing...' : 'Print Statement'}
          </button>
        </div>
      </ComponentCard>

      {error && <FormError error={error} />}
      {printError && <FormError error={printError} />}
      {printSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {printSuccess}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-500">Loading statement...</div>
      )}

      {!loading && statement && (
        <div className="space-y-6">
          <ComponentCard>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-gray-500">Customer</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{customerName}</p>
                <p className="text-xs text-gray-500">{statement.customer.email || 'No email'}</p>
                <p className="text-xs text-gray-500">{statement.customer.phone || 'No phone'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Statement Period</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {statement.statementPeriod.from || 'Start'} → {statement.statementPeriod.to || 'Today'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Terms</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{statement.customer.terms || 'NET_30'}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs uppercase text-gray-500">Opening Balance</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatBalance(statement.openingBalance)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs uppercase text-gray-500">Charges</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatSignedCurrency(totalCharges)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs uppercase text-gray-500">Payments</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatSignedCurrency(totalPayments)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs uppercase text-gray-500">Adjustments</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatSignedCurrency(totalAdjustments)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs uppercase text-gray-500">Closing Balance</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatBalance(statement.closingBalance)}
                </p>
              </div>
            </div>
          </ComponentCard>

          <ComponentCard title="Charges">
            <StandardTable
              columns={chargeColumns}
              data={chargeRows}
              emptyState={{ message: 'No charges for this period' }}
            />
          </ComponentCard>

          <ComponentCard title="Payments">
            <StandardTable
              columns={paymentColumns}
              data={paymentRows}
              emptyState={{ message: 'No payments for this period' }}
            />
          </ComponentCard>

          <ComponentCard title="Adjustments">
            <StandardTable
              columns={adjustmentColumns}
              data={adjustmentRows}
              emptyState={{ message: 'No adjustments for this period' }}
            />
          </ComponentCard>
        </div>
      )}

    </div>
  );
}
