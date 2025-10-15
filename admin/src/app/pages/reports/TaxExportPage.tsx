import { useMemo, useState } from 'react';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Label from '@shared/ui/forms/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@shared/ui/components/ui/table';
import ReportMetricCard from '@app/components/reports/ReportMetricCard';
import { getMonthRange } from '@app/components/reports/dateUtils';
import { useTaxExport } from '@domains/reports/hooks/useTaxExport';
import type { TaxExportRow, TaxExportTotals } from '@domains/reports/types';

const formatCurrency = (value: string) => `$${parseFloat(value || '0').toFixed(2)}`;

const escapeCsvValue = (value: string | number) => {
  const stringValue = value === undefined || value === null ? '' : String(value);
  if (/["\n,]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsvContent = (rows: TaxExportRow[], totals: TaxExportTotals) => {
  if (!rows || !totals) return '';

  const header = [
    'Order Number',
    'Date',
    'Customer',
    'Subtotal',
    'GST',
    'PST',
    'Total Tax',
    'Total',
    'Payment Method',
    'Order Source',
    'Status'
  ];

  const csvRows = [
    header.map(escapeCsvValue).join(',')
  ];

  rows.forEach((row) => {
    csvRows.push(
      [
        row.orderNumber,
        row.date,
        row.customerName,
        row.subtotal,
        row.gst,
        row.pst,
        row.totalTax,
        row.total,
        row.paymentMethod,
        row.orderSource ?? '',
        row.status
      ].map(escapeCsvValue).join(',')
    );
  });

  csvRows.push('');
  csvRows.push(
    [
      'Totals',
      '',
      '',
      totals.subtotal,
      totals.gst,
      totals.pst,
      totals.totalTax,
      totals.total,
      '',
      '',
      ''
    ].map(escapeCsvValue).join(',')
  );

  return csvRows.join('\n');
};

const formatLabel = (value?: string | null) => {
  if (!value) return 'Unknown';
  if (value === 'UNKNOWN') return 'Unknown';
  return value
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const TaxExportPage: React.FC = () => {
  const defaultRange = useMemo(() => getMonthRange(), []);
  const initialTaxRange = useMemo(
    () => ({ startDate: defaultRange.start, endDate: defaultRange.end }),
    [defaultRange]
  );
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const { data, loading, error, fetchTaxExport } = useTaxExport({
    initialRange: initialTaxRange,
    autoLoad: true
  });

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setRangeError('Please select both start and end dates.');
      return;
    }

    if (startDate > endDate) {
      setRangeError('Start date must be before end date.');
      return;
    }

    setRangeError(null);
    await fetchTaxExport({ startDate, endDate });
  };

  const handleDownloadCsv = () => {
    if (!data) return;

    const csvContent = buildCsvContent(data.data, data.totals);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const fileName = `bloom-tax-report-${data.period.start}-to-${data.period.end}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tax Export</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generate GST/PST totals and export detailed order data to CSV for accounting.
        </p>
      </div>

      <ComponentCard title="Generate Export">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Start Date</Label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setRangeError(null);
              }}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-[#597485] focus:outline-none focus:ring-2 focus:ring-[#597485]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>End Date</Label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setRangeError(null);
              }}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-[#597485] focus:outline-none focus:ring-2 focus:ring-[#597485]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-lg bg-[#597485] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4e6575]"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!data || loading}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                !data || loading
                  ? 'cursor-not-allowed border-gray-200 text-gray-400'
                  : 'border-[#597485] text-[#597485] hover:bg-[#597485]/10'
              }`}
            >
              Download CSV
            </button>
            {data && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last generated {new Date(data.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        {(rangeError || error) && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rangeError || error}
          </div>
        )}
      </ComponentCard>

      <ComponentCard title="Totals">
        {loading && !data ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597485]" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReportMetricCard label="Subtotal" value={formatCurrency(data.totals.subtotal)} />
            <ReportMetricCard label="GST" value={formatCurrency(data.totals.gst)} />
            <ReportMetricCard label="PST" value={formatCurrency(data.totals.pst)} />
            <ReportMetricCard label="Total Collected" value={formatCurrency(data.totals.total)} />
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Run the export to view totals for your selected range.
          </p>
        )}
      </ComponentCard>

      <ComponentCard title="Detailed Orders">
        {loading && !data ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#597485]" />
          </div>
        ) : data && data.data.length ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.data.length} orders included in this export.
            </p>
            <div className="max-h-[28rem] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell className="text-right">Subtotal</TableCell>
                    <TableCell className="text-right">GST</TableCell>
                    <TableCell className="text-right">PST</TableCell>
                    <TableCell className="text-right">Total Tax</TableCell>
                    <TableCell className="text-right">Total</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((row) => (
                    <TableRow key={row.orderNumber} className="border-b border-gray-100 last:border-none dark:border-gray-700">
                      <TableCell className="font-medium text-gray-900 dark:text-white">#{row.orderNumber}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">{row.date}</TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">{row.customerName}</TableCell>
                      <TableCell className="text-right text-sm text-gray-700 dark:text-gray-200">
                        {formatCurrency(row.subtotal)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700 dark:text-gray-200">
                        {formatCurrency(row.gst)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700 dark:text-gray-200">
                        {formatCurrency(row.pst)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700 dark:text-gray-200">
                        {formatCurrency(row.totalTax)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                        {row.paymentMethod || 'No Payments'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                        {formatLabel(row.orderSource)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                        {formatLabel(row.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No orders found for this period. Adjust your date range and generate again.
          </p>
        )}
      </ComponentCard>
    </div>
  );
};

export default TaxExportPage;
