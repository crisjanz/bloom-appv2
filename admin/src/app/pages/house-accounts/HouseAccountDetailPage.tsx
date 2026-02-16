import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import Select from '@shared/ui/forms/Select';
import TextArea from '@shared/ui/forms/input/TextArea';
import FormError from '@shared/ui/components/ui/form/FormError';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import DatePicker from '@shared/ui/forms/date-picker';
import Switch from '@shared/ui/forms/switch/Switch';
import { DollarLineIcon, DownloadIcon, PlusIcon, SaveIcon } from '@shared/assets/icons';
import { formatCurrency } from '@shared/utils/currency';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import useHouseAccounts, { HouseAccountDetailResponse, HouseAccountLedgerEntry } from '@shared/hooks/useHouseAccounts';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';
import ApplyPaymentModal from './components/ApplyPaymentModal';
import AddAdjustmentModal from './components/AddAdjustmentModal';

const termOptions = [
  { value: 'NET_15', label: 'NET 15' },
  { value: 'NET_30', label: 'NET 30' },
  { value: 'NET_45', label: 'NET 45' },
  { value: 'NET_60', label: 'NET 60' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
];

const typeStyles: Record<string, { label: string; color: string }> = {
  CHARGE: { label: 'Charge', color: 'text-red-500' },
  PAYMENT: { label: 'Payment', color: 'text-green-500' },
  ADJUSTMENT: { label: 'Adjustment', color: 'text-yellow-500' },
};

const formatBalance = (amount: number) => {
  if (amount < 0) {
    return `-${formatCurrency(Math.abs(amount))}`;
  }
  return formatCurrency(amount);
};

const formatSignedCurrency = (amount: number) => {
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
};

export default function HouseAccountDetailPage() {
  const orderNumberPrefix = useOrderNumberPrefix();
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { formatDate, loading: timezoneLoading } = useBusinessTimezone();
  const {
    getAccountDetail,
    updateSettings,
    enableAccount,
    disableAccount,
    applyPayment,
    addAdjustment,
  } = useHouseAccounts();

  const [detail, setDetail] = useState<HouseAccountDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [terms, setTerms] = useState('NET_30');
  const [notes, setNotes] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [isHouseAccount, setIsHouseAccount] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getAccountDetail(customerId, {
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        pageSize,
      });
      setDetail(data);
      setTerms(data.houseAccount.terms || 'NET_30');
      setNotes(data.houseAccount.notes || '');
      setIsHouseAccount(Boolean(data.houseAccount.isHouseAccount));
    } catch (err: any) {
      console.error('Failed to load house account detail:', err);
      setError(err?.message || 'Failed to load house account');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, getAccountDetail, page, pageSize, toDate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSaveSettings = async () => {
    if (!customerId) return;
    setSettingsSaving(true);
    setSettingsError(null);

    try {
      await updateSettings(customerId, {
        terms,
        notes: notes.trim() ? notes : '',
      });
      await loadDetail();
    } catch (err: any) {
      console.error('Failed to update house account settings:', err);
      setSettingsError(err?.message || 'Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleToggleHouseAccount = async (next: boolean) => {
    if (!customerId) return;
    setToggleLoading(true);
    setSettingsError(null);

    try {
      if (next) {
        await enableAccount(customerId);
      } else {
        await disableAccount(customerId);
      }
      setIsHouseAccount(next);
      await loadDetail();
    } catch (err: any) {
      console.error('Failed to toggle house account:', err);
      setSettingsError(err?.message || 'Failed to update account status');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleApplyPayment = async (payload: { amount: number; reference?: string; notes?: string }) => {
    if (!customerId) return;
    await applyPayment(customerId, payload);
    await loadDetail();
  };

  const handleAddAdjustment = async (payload: { amount: number; description: string }) => {
    if (!customerId) return;
    await addAdjustment(customerId, payload);
    await loadDetail();
  };

  const ledger = detail?.ledger || [];
  const pagination = detail?.pagination;

  const columns: ColumnDef<HouseAccountLedgerEntry>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        className: 'min-w-[120px]',
        render: (entry) => {
          const formatted = timezoneLoading ? entry.createdAt : formatDate(entry.createdAt);
          return <span className="text-sm text-gray-600 dark:text-gray-400">{formatted}</span>;
        },
      },
      {
        key: 'type',
        header: 'Type',
        className: 'min-w-[140px]',
        render: (entry) => {
          const meta = typeStyles[entry.type] || { label: entry.type, color: 'text-gray-500' };
          return (
            <div className="flex items-center gap-2">
              <span className={`text-2xl leading-none ${meta.color}`}>•</span>
              <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
            </div>
          );
        },
      },
      {
        key: 'description',
        header: 'Description',
        className: 'min-w-[240px]',
        render: (entry) => {
          if (entry.order?.id && entry.order.orderNumber) {
            return (
              <Link
                to={`/orders/${entry.order.id}`}
                className="text-sm text-brand-500 hover:text-brand-600"
              >
                {entry.description}
              </Link>
            );
          }
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">{entry.description}</span>
          );
        },
      },
      {
        key: 'amount',
        header: 'Amount',
        className: 'min-w-[120px] text-right',
        render: (entry) => {
          const amountColor = entry.amount < 0 ? 'text-green-600' : entry.amount > 0 ? 'text-red-600' : 'text-gray-500';
          return (
            <span className={`text-sm font-medium ${amountColor}`}>
              {formatSignedCurrency(entry.amount)}
            </span>
          );
        },
      },
      {
        key: 'balance',
        header: 'Balance',
        className: 'min-w-[120px] text-right',
        render: (entry) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatBalance(entry.balance || 0)}
          </span>
        ),
      },
      {
        key: 'reference',
        header: 'Reference',
        className: 'min-w-[140px]',
        render: (entry) => {
          if (entry.order?.orderNumber) {
            return (
              <div className="flex flex-col">
                <Link
                  to={`/orders/${entry.order.id}`}
                  className="text-sm text-brand-500 hover:text-brand-600"
                >
                  #{formatOrderNumber(entry.order.orderNumber, orderNumberPrefix)}
                </Link>
                {entry.reference ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{entry.reference}</span>
                ) : null}
              </div>
            );
          }
          return (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {entry.reference || '—'}
            </span>
          );
        },
      },
    ],
    [formatDate, timezoneLoading]
  );

  if (loading && !detail) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="text-sm text-gray-500">Loading house account...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <PageBreadcrumb />
        <div className="text-sm text-gray-500">House account not found.</div>
        {error && <FormError error={error} />}
      </div>
    );
  }

  const customerName = `${detail.customer.firstName} ${detail.customer.lastName}`.trim();

  return (
    <div className="p-6 space-y-6">
      <PageBreadcrumb />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">House Account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage balances, terms, and ledger activity for this customer.
        </p>
      </div>

      {error && <FormError error={error} />}

      <ComponentCard>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{customerName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{detail.customer.email || 'No email on file'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{detail.customer.phone || 'No phone on file'}</p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs uppercase text-gray-500">Current Balance</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                {formatBalance(detail.houseAccount.currentBalance || 0)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <DollarLineIcon className="h-4 w-4" />
              Apply Payment
            </button>
            <button
              type="button"
              onClick={() => setShowAdjustmentModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-500 hover:text-brand-500"
            >
              <PlusIcon className="h-4 w-4" />
              Add Adjustment
            </button>
            <button
              type="button"
              onClick={() => navigate(`/house-accounts/${detail.customer.id}/statement`)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-500 hover:text-brand-500"
            >
              <DownloadIcon className="h-4 w-4" />
              Print Statement
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Terms"
            options={termOptions}
            value={terms || 'NET_30'}
            onChange={(value) => setTerms(value)}
            allowCustomValue
            customOptionLabel="Custom terms"
          />

          <div className="flex items-center gap-2">
            <Switch
              label={toggleLoading ? 'Updating...' : 'House Account Enabled'}
              checked={isHouseAccount}
              onChange={(value) => handleToggleHouseAccount(value)}
              disabled={toggleLoading}
            />
          </div>
        </div>

        <div className="mt-4">
          <TextArea
            label="Notes"
            placeholder="Internal notes about this account"
            rows={3}
            value={notes || ''}
            onChange={(value) => setNotes(value)}
          />
        </div>

        {settingsError && <FormError error={settingsError} />}

        <FormFooter
          onSubmit={handleSaveSettings}
          submitting={settingsSaving}
          submitText="Save Settings"
          submitIcon={<SaveIcon className="w-4 h-4" />}
        />
      </ComponentCard>

      <ComponentCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              id="house-ledger-from"
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
                  setPage(1);
                }
              }}
            />

            <DatePicker
              id="house-ledger-to"
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
                  setPage(1);
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="text-sm text-brand-500 hover:text-brand-600"
            >
              Clear dates
            </button>
          </div>
        </div>

        <StandardTable
          columns={columns}
          data={ledger}
          loading={loading && ledger.length === 0}
          emptyState={{
            message: 'No ledger entries found for this period',
          }}
          pagination={
            pagination
              ? {
                  currentPage: pagination.page,
                  totalItems: pagination.total,
                  itemsPerPage: pagination.pageSize,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </ComponentCard>

      <ApplyPaymentModal
        isOpen={showPaymentModal}
        customerName={customerName}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handleApplyPayment}
      />

      <AddAdjustmentModal
        isOpen={showAdjustmentModal}
        customerName={customerName}
        onClose={() => setShowAdjustmentModal(false)}
        onSubmit={handleAddAdjustment}
      />
    </div>
  );
}
