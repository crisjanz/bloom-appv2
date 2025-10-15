import type { BreakdownTotals } from '@domains/reports/types';

interface BreakdownListProps {
  title: string;
  data: BreakdownTotals | undefined;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2
  }).format(amount / 100);

const BreakdownList: React.FC<BreakdownListProps> = ({ title, data }) => {
  const entries = data
    ? Object.entries(data).sort(([, a], [, b]) => b.amount - a.amount)
    : [];

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No data for this range.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([key, value]) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700/60"
            >
              <span className="font-medium text-gray-700 capitalize dark:text-gray-200">
                {key.toLowerCase() === 'unknown' ? 'Unknown' : key.replace(/_/g, ' ')}
              </span>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(value.amount)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{value.count} orders</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BreakdownList;
