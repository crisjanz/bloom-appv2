import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import Select from '@shared/ui/forms/Select';
import FormError from '@shared/ui/components/ui/form/FormError';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { DollarLineIcon, DownloadIcon, EyeIcon } from '@shared/assets/icons';
import { formatCurrency } from '@shared/utils/currency';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import useHouseAccounts, { HouseAccountSummary } from '@shared/hooks/useHouseAccounts';
import ApplyPaymentModal from './components/ApplyPaymentModal';

interface HouseAccountRow extends HouseAccountSummary {
  id: string;
}

const filterOptions = [
  { value: 'ALL', label: 'All Accounts' },
  { value: 'BALANCE', label: 'With Balance Only' },
];

export default function HouseAccountsPage() {
  const navigate = useNavigate();
  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();
  const { listAccounts, applyPayment } = useHouseAccounts();

  const [accounts, setAccounts] = useState<HouseAccountRow[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAccount, setSelectedAccount] = useState<HouseAccountRow | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await listAccounts({ hasBalance: filter === 'BALANCE' });
      const rows = (results || []).map((account) => ({
        ...account,
        id: account.customerId,
      }));
      setAccounts(rows);
    } catch (err: any) {
      console.error('Failed to load house accounts:', err);
      setError(err?.message || 'Failed to load house accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [listAccounts, filter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleApplyPayment = async (payload: { amount: number; reference?: string; notes?: string }) => {
    if (!selectedAccount) return;
    await applyPayment(selectedAccount.customerId, payload);
    await loadAccounts();
  };

  const columns: ColumnDef<HouseAccountRow>[] = useMemo(
    () => [
      {
        key: 'customer',
        header: 'Customer',
        className: 'min-w-[200px]',
        render: (row) => (
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {row.customerName || 'Unnamed Customer'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.customerId}
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        className: 'min-w-[180px]',
        render: (row) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.email || '—'}
          </span>
        ),
      },
      {
        key: 'phone',
        header: 'Phone',
        className: 'min-w-[140px]',
        render: (row) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.phone || '—'}
          </span>
        ),
      },
      {
        key: 'terms',
        header: 'Terms',
        className: 'min-w-[120px]',
        render: (row) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">{row.terms || 'NET_30'}</span>
        ),
      },
      {
        key: 'balance',
        header: 'Current Balance',
        className: 'min-w-[140px] text-right',
        render: (row) => (
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(row.currentBalance || 0)}
          </span>
        ),
      },
      {
        key: 'lastActivity',
        header: 'Last Activity',
        className: 'min-w-[140px]',
        render: (row) => {
          if (!row.lastActivity) {
            return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;
          }
          const formatted = timezoneLoading ? row.lastActivity : formatDate(row.lastActivity);
          return <span className="text-sm text-gray-600 dark:text-gray-400">{formatted}</span>;
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        className: 'min-w-[120px]',
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/house-accounts/${row.customerId}`);
              }}
              className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-500"
              title="View account"
            >
              <EyeIcon className="h-4 w-4 mx-auto" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAccount(row);
                setShowPaymentModal(true);
              }}
              className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-500"
              title="Apply payment"
            >
              <DollarLineIcon className="h-4 w-4 mx-auto" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/house-accounts/${row.customerId}/statement`);
              }}
              className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:border-brand-500 hover:text-brand-500"
              title="View statement"
            >
              <DownloadIcon className="h-4 w-4 mx-auto" />
            </button>
          </div>
        ),
      },
    ],
    [formatDate, navigate, timezoneLoading]
  );

  return (
    <div className="p-6">
      <PageBreadcrumb />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">House Accounts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track house account balances, payments, and statements.
          </p>
        </div>
        <Link
          to="/customers"
          className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View All Customers
        </Link>
      </div>

      <ComponentCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4">
          <div className="max-w-xs">
            <Select
              label="Filter"
              options={filterOptions}
              value={filter}
              onChange={(value) => setFilter(value)}
            />
          </div>
          <button
            type="button"
            onClick={loadAccounts}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-brand-500 transition-colors hover:border-brand-500 hover:bg-brand-500/10"
          >
            Refresh
          </button>
        </div>

        {error && <FormError error={error} />}

        <StandardTable
          columns={columns}
          data={accounts}
          loading={loading && accounts.length === 0}
          emptyState={{
            message: error ? `Failed to load accounts: ${error}` : 'No house accounts found',
          }}
          onRowClick={(row) => navigate(`/house-accounts/${row.customerId}`)}
          pagination={
            accounts.length > 0
              ? {
                  currentPage: 1,
                  totalItems: accounts.length,
                  itemsPerPage: accounts.length,
                  onPageChange: () => undefined,
                }
              : undefined
          }
        />
      </ComponentCard>

      <ApplyPaymentModal
        isOpen={showPaymentModal}
        customerName={selectedAccount?.customerName}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedAccount(null);
        }}
        onSubmit={handleApplyPayment}
      />
    </div>
  );
}
