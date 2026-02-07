import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '@shared/utils/currency';
import type { HouseAccountStatement } from '@shared/hooks/useHouseAccounts';

interface StoreInfo {
  storeName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

interface HouseAccountStatementPrintViewProps {
  statement: HouseAccountStatement | null;
  storeInfo: StoreInfo | null;
  generatedAt?: string;
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

const buildStoreLine = (storeInfo: StoreInfo | null) => {
  if (!storeInfo) return '';
  const parts = [storeInfo.address, storeInfo.city, storeInfo.state, storeInfo.zipCode].filter(Boolean);
  return parts.join(', ');
};

export default function HouseAccountStatementPrintView({
  statement,
  storeInfo,
  generatedAt = new Date().toISOString(),
}: HouseAccountStatementPrintViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canUseDOM = typeof document !== 'undefined';

  if (canUseDOM && statement && !containerRef.current) {
    const el = document.createElement('div');
    el.className = 'print-container';
    containerRef.current = el;
  }

  useEffect(() => {
    if (!canUseDOM || !statement || !containerRef.current) {
      return;
    }

    const el = containerRef.current!;
    document.body.appendChild(el);

    return () => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, [canUseDOM, statement]);

  if (!canUseDOM || !statement) {
    return null;
  }

  const storeLine = buildStoreLine(storeInfo);
  const storeName = storeInfo?.storeName || '';
  const customerName = `${statement.customer.firstName} ${statement.customer.lastName}`.trim();
  const totalCharges = statement.charges.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalPayments = statement.payments.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalAdjustments = statement.adjustments.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const periodLabel = statement.statementPeriod.from || statement.statementPeriod.to
    ? `${statement.statementPeriod.from || 'Start'} → ${statement.statementPeriod.to || 'Today'}`
    : 'All Activity';

  return createPortal(
    <div className="print-report mx-auto max-w-4xl px-6 py-8 text-gray-900">
      <header className="mb-6 border-b border-gray-300 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold uppercase tracking-wide">House Account Statement</h1>
            {storeName && <p className="text-sm text-gray-700">{storeName}</p>}
            {storeLine && <p className="text-xs text-gray-600">{storeLine}</p>}
            {(storeInfo?.phone || storeInfo?.email) && (
              <p className="text-xs text-gray-600">
                {[storeInfo?.phone, storeInfo?.email].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
          <div className="text-right text-[11px] leading-tight text-gray-600">
            <p>Statement Period: {periodLabel}</p>
            <p>Generated: {new Date(generatedAt).toLocaleString()}</p>
          </div>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 text-[11px]">
        <div className="border border-gray-300 p-3">
          <p className="text-[10px] uppercase text-gray-500">Bill To</p>
          <p className="font-semibold">{customerName}</p>
          {statement.customer.email && <p>{statement.customer.email}</p>}
          {statement.customer.phone && <p>{statement.customer.phone}</p>}
          <p className="mt-2 text-[10px] uppercase text-gray-500">Terms</p>
          <p>{statement.customer.terms || 'NET_30'}</p>
        </div>

        <table className="w-full border border-gray-300">
          <tbody>
            <tr className="border-b border-gray-300">
              <th className="bg-gray-100 px-3 py-1 text-left uppercase tracking-wide">Opening Balance</th>
              <td className="px-3 py-1 text-right font-semibold">
                {formatBalance(statement.openingBalance)}
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-1 text-left uppercase tracking-wide">Charges</th>
              <td className="px-3 py-1 text-right">{formatSignedCurrency(totalCharges)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-1 text-left uppercase tracking-wide">Payments</th>
              <td className="px-3 py-1 text-right">{formatSignedCurrency(totalPayments)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-1 text-left uppercase tracking-wide">Adjustments</th>
              <td className="px-3 py-1 text-right">{formatSignedCurrency(totalAdjustments)}</td>
            </tr>
            <tr>
              <th className="bg-gray-100 px-3 py-1 text-left uppercase tracking-wide">Closing Balance</th>
              <td className="px-3 py-1 text-right font-semibold">
                {formatBalance(statement.closingBalance)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Charges</h2>
        <table className="w-full border border-gray-300 text-[11px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Reference</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {statement.charges.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-gray-500">
                  No charges for this period.
                </td>
              </tr>
            ) : (
              statement.charges.map((entry, index) => (
                <tr key={`charge-${index}`} className="border-t border-gray-200">
                  <td className="px-3 py-2">{formatDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.orderNumber ? `#${entry.orderNumber}` : '—'}</td>
                  <td className="px-3 py-2">{entry.reference || '—'}</td>
                  <td className="px-3 py-2">{entry.description}</td>
                  <td className="px-3 py-2 text-right">{formatSignedCurrency(entry.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Payments</h2>
        <table className="w-full border border-gray-300 text-[11px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Reference</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {statement.payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-gray-500">
                  No payments for this period.
                </td>
              </tr>
            ) : (
              statement.payments.map((entry, index) => (
                <tr key={`payment-${index}`} className="border-t border-gray-200">
                  <td className="px-3 py-2">{formatDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.reference || '—'}</td>
                  <td className="px-3 py-2">{entry.description}</td>
                  <td className="px-3 py-2 text-right">{formatSignedCurrency(entry.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Adjustments</h2>
        <table className="w-full border border-gray-300 text-[11px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {statement.adjustments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                  No adjustments for this period.
                </td>
              </tr>
            ) : (
              statement.adjustments.map((entry, index) => (
                <tr key={`adjustment-${index}`} className="border-t border-gray-200">
                  <td className="px-3 py-2">{formatDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.description}</td>
                  <td className="px-3 py-2 text-right">{formatSignedCurrency(entry.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>,
    containerRef.current
  );
}
