import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Select from '@shared/ui/forms/Select';
import LoadingButton from '@shared/ui/components/ui/button/LoadingButton';
import { useApiClient } from '@shared/hooks/useApiClient';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';
import {
  getAllStatuses,
  getNextStatuses,
  getStatusColor,
  getStatusDisplayText,
  type BackendOrderStatus
} from '@shared/utils/orderStatusHelpers';
import MobilePageHeader from '@app/components/mobile/MobilePageHeader';
import MobileFulfillmentActionTabs from '@app/components/mobile/MobileFulfillmentActionTabs';
import { toast } from 'sonner';
import {
  fetchFulfillmentOrder,
  formatAddress,
  formatRecipientName,
  patchFulfillmentStatus,
  toBackendStatus,
  toOrderType,
  type MobileFulfillmentOrder
} from './mobileFulfillmentHelpers';

export default function MobileFulfillmentStatusPage() {
  const { id } = useParams<{ id: string }>();
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();

  const [order, setOrder] = useState<MobileFulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BackendOrderStatus | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError('Order not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const loadedOrder = await fetchFulfillmentOrder(apiClient, id);
      setOrder(loadedOrder);

      const currentStatus = toBackendStatus(loadedOrder.status);
      if (currentStatus) {
        setSelectedStatus(currentStatus);
      } else {
        setSelectedStatus(null);
      }
    } catch (loadError) {
      console.error('Failed to load mobile fulfillment status order:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [apiClient, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const currentStatus = toBackendStatus(order?.status || '');
  const orderType = toOrderType(order?.type);

  const nextStatuses = useMemo<BackendOrderStatus[]>(() => {
    if (!currentStatus) return [];
    return getNextStatuses(currentStatus, orderType) as BackendOrderStatus[];
  }, [currentStatus, orderType]);

  const statusOptions = useMemo(() => {
    if (!currentStatus) return [];

    const values = getAllStatuses() as BackendOrderStatus[];
    return values.map((status) => ({
      value: status,
      label: getStatusDisplayText(status, orderType)
    }));
  }, [currentStatus, orderType]);

  const canSubmit = Boolean(selectedStatus && currentStatus && selectedStatus !== currentStatus);

  const handleUpdateStatus = async () => {
    if (!order || !selectedStatus || !canSubmit) return;

    try {
      setUpdating(true);
      await patchFulfillmentStatus(apiClient, order.id, selectedStatus);
      setOrder((previous) => (previous ? { ...previous, status: selectedStatus } : previous));
      toast.success(`Status updated to ${getStatusDisplayText(selectedStatus, orderType)}`);
    } catch (statusError) {
      console.error('Failed to update fulfillment status:', statusError);
      toast.error(statusError instanceof Error ? statusError.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
          <MobilePageHeader title="Status" showBackButton backTo="/mobile/fulfillment" />
          <div className="rounded-3xl bg-white p-5 text-sm text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
            Loading order...
          </div>
        </div>
      </div>
    );
  }

  if (!order || !currentStatus) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md px-4 py-5 space-y-6">
          <MobilePageHeader title="Status" showBackButton backTo="/mobile/fulfillment" />
          <div className="rounded-3xl bg-white p-5 text-sm text-red-600 shadow-sm dark:bg-gray-800 dark:text-red-300">
            {error || 'Order not found'}
          </div>
          <button
            type="button"
            onClick={loadOrder}
            className="h-11 w-full rounded-2xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md px-4 py-5 space-y-5">
        <MobilePageHeader title="Status" showBackButton backTo="/mobile/fulfillment" />
        <MobileFulfillmentActionTabs orderId={order.id} active="status" />

        <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            #{formatOrderNumber(order.orderNumber, orderNumberPrefix)}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatRecipientName(order)}</p>
          {formatAddress(order) ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatAddress(order)}</p> : null}

          <div className="mt-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(currentStatus)}`}>
              {getStatusDisplayText(currentStatus, orderType)}
            </span>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <Select
            label="Update Status"
            options={statusOptions}
            value={selectedStatus || currentStatus}
            onChange={(value) => setSelectedStatus(value as BackendOrderStatus)}
            placeholder="Select status"
            disabled={updating}
          />

          <LoadingButton
            type="button"
            onClick={handleUpdateStatus}
            loading={updating}
            loadingText="Updating..."
            disabled={!canSubmit}
            className="mt-4 w-full"
          >
            Update Status
          </LoadingButton>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Allowed next statuses: {nextStatuses.length > 0
              ? nextStatuses.map((status) => getStatusDisplayText(status, orderType)).join(', ')
              : 'none (final status)'}
          </p>
        </section>
      </div>
    </div>
  );
}
