import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import ComponentCard from '@shared/ui/common/ComponentCard';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { Modal } from '@shared/ui/components/ui/modal';
import LoadingButton from '@shared/ui/components/ui/button/LoadingButton';
import DatePicker from '@shared/ui/forms/date-picker';
import {
  useSubscription,
  Subscription,
  SubscriptionDelivery,
} from '@shared/hooks/useSubscriptions';
import { useApiClient } from '@shared/hooks/useApiClient';
import { formatCurrency } from '@shared/utils/currency';

interface SubscriptionDetailProps {
  subscriptionId: string;
  onBack?: () => void;
  compact?: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 Weeks',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom Dates',
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    ACTIVE: { color: 'text-green-500', label: 'Active' },
    PAUSED: { color: 'text-yellow-500', label: 'Paused' },
    CANCELLED: { color: 'text-red-500', label: 'Cancelled' },
    COMPLETED: { color: 'text-gray-400', label: 'Completed' },
  };
  const c = config[status] || { color: 'text-gray-400', label: status };
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <span className={`text-2xl leading-none ${c.color}`}>&bull;</span>
      <span>{c.label}</span>
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    SCHEDULED: { color: 'text-green-500', label: 'Scheduled' },
    PREPARING: { color: 'text-blue-500', label: 'Preparing' },
    DELIVERED: { color: 'text-gray-400', label: 'Delivered' },
    SKIPPED: { color: 'text-yellow-500', label: 'Skipped' },
    RESCHEDULED: { color: 'text-orange-500', label: 'Rescheduled' },
  };
  const c = config[status] || { color: 'text-gray-400', label: status };
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className={`text-2xl leading-none ${c.color}`}>&bull;</span>
      <span>{c.label}</span>
    </span>
  );
}

function InfoRow({
  label,
  value,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'py-1' : 'py-2'}>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{value || '--'}</dd>
    </div>
  );
}

export default function SubscriptionDetail({
  subscriptionId,
  onBack,
  compact = false,
}: SubscriptionDetailProps) {
  const {
    subscription,
    loading,
    error,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    updateDelivery,
    refresh,
  } = useSubscription(subscriptionId);

  const apiClient = useApiClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [skipDelivery, setSkipDelivery] = useState<SubscriptionDelivery | null>(null);
  const [rescheduleDelivery, setRescheduleDelivery] = useState<SubscriptionDelivery | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [changeProductDelivery, setChangeProductDelivery] = useState<SubscriptionDelivery | null>(null);
  const [subscriptionProducts, setSubscriptionProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const fetchSubscriptionProducts = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/subscriptions/storefront/products');
      setSubscriptionProducts(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, [apiClient]);

  useEffect(() => {
    if (changeProductDelivery) {
      fetchSubscriptionProducts();
      setSelectedProductId(changeProductDelivery.productId || '');
    }
  }, [changeProductDelivery, fetchSubscriptionProducts]);

  // Sort deliveries: upcoming first (SCHEDULED/PREPARING), then past
  const sortedDeliveries = useMemo(() => {
    if (!subscription?.deliveries) return [];
    const upcoming = ['SCHEDULED', 'PREPARING'];
    return [...subscription.deliveries].sort((a, b) => {
      const aUpcoming = upcoming.includes(a.status) ? 0 : 1;
      const bUpcoming = upcoming.includes(b.status) ? 0 : 1;
      if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });
  }, [subscription?.deliveries]);

  const nextDelivery = useMemo(() => {
    if (!subscription?.deliveries) return null;
    const now = new Date();
    return subscription.deliveries
      .filter((d) => ['SCHEDULED', 'PREPARING'].includes(d.status))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .find((d) => new Date(d.scheduledDate) >= now) || null;
  }, [subscription?.deliveries]);

  // --- Action handlers ---

  async function handlePauseResume() {
    if (!subscription) return;
    const action = subscription.status === 'PAUSED' ? 'resume' : 'pause';
    setActionLoading(action);
    try {
      if (action === 'pause') {
        await pauseSubscription();
        toast.success('Subscription paused');
      } else {
        await resumeSubscription();
        toast.success('Subscription resumed');
      }
    } catch {
      toast.error(`Failed to ${action} subscription`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    setActionLoading('cancel');
    try {
      await cancelSubscription();
      toast.success('Subscription cancelled');
      setShowCancelModal(false);
    } catch {
      toast.error('Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSkipDelivery() {
    if (!skipDelivery) return;
    setActionLoading('skip');
    try {
      await updateDelivery(skipDelivery.id, { status: 'SKIPPED' });
      toast.success('Delivery skipped');
      setSkipDelivery(null);
    } catch {
      toast.error('Failed to skip delivery');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRescheduleDelivery() {
    if (!rescheduleDelivery || !rescheduleDate) return;
    setActionLoading('reschedule');
    try {
      await updateDelivery(rescheduleDelivery.id, {
        scheduledDate: rescheduleDate,
        status: 'RESCHEDULED',
      });
      toast.success('Delivery rescheduled');
      setRescheduleDelivery(null);
      setRescheduleDate('');
    } catch {
      toast.error('Failed to reschedule delivery');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleChangeProduct() {
    if (!changeProductDelivery || !selectedProductId) return;
    setActionLoading('changeProduct');
    try {
      const product = subscriptionProducts.find((p: any) => p.id === selectedProductId);
      await updateDelivery(changeProductDelivery.id, {
        productId: selectedProductId,
        productName: product?.name || null,
        priceCents: product?.variants?.[0]?.priceCents || product?.basePriceCents || undefined,
      });
      toast.success('Product updated');
      setChangeProductDelivery(null);
    } catch {
      toast.error('Failed to change product');
    } finally {
      setActionLoading(null);
    }
  }

  // --- Loading / Error states ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error || 'Subscription not found'}</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-brand-500 hover:underline text-sm">
            Go back
          </button>
        )}
      </div>
    );
  }

  const isActive = subscription.status === 'ACTIVE';
  const isPaused = subscription.status === 'PAUSED';
  const canPauseResume = isActive || isPaused;
  const canCancel = isActive || isPaused;

  // --- Deliveries table columns ---

  const deliveryColumns: ColumnDef<SubscriptionDelivery>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (d) => formatDate(d.scheduledDate),
    },
    {
      key: 'product',
      header: 'Product',
      render: (d) => d.productName || d.product?.name || "Designer's Choice",
    },
    {
      key: 'price',
      header: 'Price',
      render: (d) => formatCurrency(d.priceCents),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <DeliveryStatusBadge status={d.status} />,
    },
    {
      key: 'order',
      header: 'Order #',
      render: (d) =>
        d.order ? (
          <Link
            to={`/orders/${d.order.id}`}
            className="text-brand-500 hover:underline text-sm"
          >
            #{d.order.orderNumber}
          </Link>
        ) : (
          '--'
        ),
    },
    ...(compact
      ? []
      : [
          {
            key: 'notes',
            header: 'Notes',
            render: (d: SubscriptionDelivery) => (
              <span className="text-sm text-gray-500 truncate max-w-[150px] block">
                {d.customNotes || '--'}
              </span>
            ),
          },
        ]),
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => {
        const canModify = ['SCHEDULED', 'PREPARING'].includes(d.status);
        if (!canModify) return null;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkipDelivery(d)}
              className="text-xs text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium"
            >
              Skip
            </button>
            <button
              onClick={() => {
                setRescheduleDelivery(d);
                setRescheduleDate(d.scheduledDate.split('T')[0]);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Reschedule
            </button>
            {subscription.style === 'PICK_YOUR_OWN' && (
              <button
                onClick={() => setChangeProductDelivery(d)}
                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
              >
                Change
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // --- Render ---

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${compact ? '' : 'mb-2'}`}>
        <div className="flex items-center gap-3 flex-wrap">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-semibold text-gray-900 dark:text-white`}>
            {subscription.subscriptionNumber}
          </h2>
          <StatusBadge status={subscription.status} />
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {subscription.billingType === 'PREPAID' ? 'Prepaid' : 'Recurring'}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {subscription.style === 'DESIGNERS_CHOICE' ? "Designer's Choice" : 'Pick Your Own'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canPauseResume && (
            <LoadingButton
              onClick={handlePauseResume}
              loading={actionLoading === 'pause' || actionLoading === 'resume'}
              loadingText={isPaused ? 'Resuming...' : 'Pausing...'}
              variant="secondary"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </LoadingButton>
          )}
          {canCancel && (
            <LoadingButton
              onClick={() => setShowCancelModal(true)}
              variant="danger"
            >
              Cancel
            </LoadingButton>
          )}
          <Link
            to={`/subscriptions/${subscription.id}/edit`}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 font-medium text-sm transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Key Stats */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-4`}>
        {subscription.billingType === 'PREPAID' && subscription.totalDeliveries && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Deliveries</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {subscription.completedDeliveries} / {subscription.totalDeliveries}
            </div>
          </div>
        )}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Next Delivery</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {nextDelivery ? formatDate(nextDelivery.scheduledDate) : 'None scheduled'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Price / Delivery</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {formatCurrency(subscription.defaultPriceCents)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Frequency</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {FREQUENCY_LABELS[subscription.frequency] || subscription.frequency}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-4`}>
        {/* Customer & Recipient */}
        <ComponentCard title="Customer & Recipient">
          <dl className={compact ? 'space-y-1' : 'space-y-2'}>
            <InfoRow
              label="Buyer"
              compact={compact}
              value={
                <Link to={`/customers/${subscription.customer.id}`} className="text-brand-500 hover:underline">
                  {subscription.customer.firstName} {subscription.customer.lastName}
                </Link>
              }
            />
            {subscription.customer.email && (
              <InfoRow label="Buyer Email" value={subscription.customer.email} compact={compact} />
            )}
            <InfoRow label="Recipient" value={subscription.recipientName} compact={compact} />
            {subscription.recipientPhone && (
              <InfoRow label="Recipient Phone" value={subscription.recipientPhone} compact={compact} />
            )}
            <InfoRow
              label="Delivery Address"
              compact={compact}
              value={
                <span className="text-sm">
                  {subscription.recipientAddress}
                  {subscription.recipientCity && `, ${subscription.recipientCity}`}
                  {subscription.recipientProvince && ` ${subscription.recipientProvince}`}
                  {subscription.recipientPostalCode && ` ${subscription.recipientPostalCode}`}
                </span>
              }
            />
            {!compact && subscription.notes && (
              <InfoRow label="Notes" value={subscription.notes} compact={compact} />
            )}
          </dl>
        </ComponentCard>

        {/* Product & Schedule */}
        <ComponentCard title="Product & Schedule">
          <dl className={compact ? 'space-y-1' : 'space-y-2'}>
            <InfoRow
              label="Style"
              compact={compact}
              value={subscription.style === 'DESIGNERS_CHOICE' ? "Designer's Choice" : 'Pick Your Own'}
            />
            {subscription.plan && (
              <InfoRow label="Plan" value={subscription.plan.name} compact={compact} />
            )}
            {subscription.colorPalette && (
              <InfoRow label="Color Palette" value={subscription.colorPalette} compact={compact} />
            )}
            <InfoRow
              label="Frequency"
              compact={compact}
              value={FREQUENCY_LABELS[subscription.frequency] || subscription.frequency}
            />
            {subscription.preferredDayOfWeek !== null && subscription.preferredDayOfWeek !== undefined && (
              <InfoRow
                label="Preferred Day"
                compact={compact}
                value={DAY_NAMES[subscription.preferredDayOfWeek]}
              />
            )}
            <InfoRow label="Start Date" value={formatDate(subscription.startDate)} compact={compact} />
            <InfoRow label="Source" value={subscription.source} compact={compact} />
          </dl>
        </ComponentCard>

        {/* Billing */}
        <ComponentCard title="Billing">
          <dl className={compact ? 'space-y-1' : 'space-y-2'}>
            <InfoRow
              label="Billing Type"
              compact={compact}
              value={subscription.billingType === 'PREPAID' ? 'Prepaid' : 'Recurring'}
            />
            <InfoRow
              label="Price per Delivery"
              compact={compact}
              value={formatCurrency(subscription.defaultPriceCents)}
            />
            {subscription.billingType === 'PREPAID' && subscription.totalPrepaidCents != null && (
              <InfoRow
                label="Total Prepaid"
                compact={compact}
                value={formatCurrency(subscription.totalPrepaidCents)}
              />
            )}
            <InfoRow
              label="Card on File"
              compact={compact}
              value={subscription.stripePaymentMethodId ? 'Yes' : 'No'}
            />
            {subscription.pausedAt && (
              <InfoRow label="Paused At" value={formatDate(subscription.pausedAt)} compact={compact} />
            )}
            {subscription.cancelledAt && (
              <InfoRow label="Cancelled At" value={formatDate(subscription.cancelledAt)} compact={compact} />
            )}
          </dl>
        </ComponentCard>
      </div>

      {/* Deliveries Table */}
      <ComponentCard title="Deliveries">
        <StandardTable<SubscriptionDelivery>
          columns={deliveryColumns}
          data={sortedDeliveries}
          loading={loading}
          emptyState={{
            title: 'No deliveries yet',
            message: 'Deliveries will appear here once generated.',
          }}
        />
      </ComponentCard>

      {/* Skip Delivery Modal */}
      <Modal isOpen={!!skipDelivery} onClose={() => setSkipDelivery(null)} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Skip Delivery</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Are you sure you want to skip this delivery
            {skipDelivery ? ` scheduled for ${formatDate(skipDelivery.scheduledDate)}` : ''}?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSkipDelivery(null)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
            >
              No, Keep It
            </button>
            <LoadingButton
              onClick={handleSkipDelivery}
              loading={actionLoading === 'skip'}
              loadingText="Skipping..."
              variant="danger"
            >
              Yes, Skip
            </LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Reschedule Delivery Modal */}
      <Modal isOpen={!!rescheduleDelivery} onClose={() => { setRescheduleDelivery(null); setRescheduleDate(''); }} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Reschedule Delivery</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose a new date for this delivery
            {rescheduleDelivery ? ` (currently ${formatDate(rescheduleDelivery.scheduledDate)})` : ''}.
          </p>
          <div className="mb-4">
            <DatePicker
              id="reschedule-date"
              label="New Date"
              defaultDate={rescheduleDate || undefined}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  const d = selectedDates[0];
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  setRescheduleDate(`${year}-${month}-${day}`);
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setRescheduleDelivery(null); setRescheduleDate(''); }}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              onClick={handleRescheduleDelivery}
              loading={actionLoading === 'reschedule'}
              loadingText="Rescheduling..."
              variant="primary"
              disabled={!rescheduleDate}
            >
              Reschedule
            </LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Cancel Subscription</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Are you sure you want to cancel this subscription? This action cannot be undone.
            {subscription.billingType === 'PREPAID' && ' Any remaining prepaid deliveries will not be refunded automatically.'}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
            >
              Keep Subscription
            </button>
            <LoadingButton
              onClick={handleCancel}
              loading={actionLoading === 'cancel'}
              loadingText="Cancelling..."
              variant="danger"
            >
              Yes, Cancel
            </LoadingButton>
          </div>
        </div>
      </Modal>

      {/* Change Product Modal */}
      <Modal isOpen={!!changeProductDelivery} onClose={() => setChangeProductDelivery(null)} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Change Product</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select a product for the delivery on{' '}
            {changeProductDelivery ? formatDate(changeProductDelivery.scheduledDate) : ''}.
          </p>
          {subscriptionProducts.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No subscription-eligible products found.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {subscriptionProducts.map((p: any) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProductId === p.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="changeProduct"
                    value={p.id}
                    checked={selectedProductId === p.id}
                    onChange={() => setSelectedProductId(p.id)}
                    className="accent-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(p.variants?.[0]?.priceCents || p.basePriceCents || 0)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setChangeProductDelivery(null)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              onClick={handleChangeProduct}
              loading={actionLoading === 'changeProduct'}
              loadingText="Saving..."
              variant="primary"
              disabled={!selectedProductId}
            >
              Save
            </LoadingButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
