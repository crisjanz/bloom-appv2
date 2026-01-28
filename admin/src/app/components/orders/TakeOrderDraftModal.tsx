import { useEffect, useState } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import { formatCurrency } from '@shared/utils/currency';
import { useApiClient } from '@shared/hooks/useApiClient';
import type { TakeOrderLocalDraft } from '@shared/utils/takeOrderLocalDrafts';

const formatRelativeTime = (dateString: string) => {
  const savedAt = new Date(dateString).getTime();
  if (!Number.isFinite(savedAt)) return 'Unknown time';

  const diffMs = Date.now() - savedAt;
  if (diffMs < 60_000) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatDraftDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getCustomerLabel = (customer: any) => {
  if (!customer) return 'No customer';
  if (customer.name) return customer.name;
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'No customer';
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  localDrafts: TakeOrderLocalDraft[];
  onLoadLocalDraft: (draft: TakeOrderLocalDraft) => void;
  onDeleteLocalDraft: (draftId: string) => void;
  onLoadDbDraft: (order: any) => void;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
};

export default function TakeOrderDraftModal({
  isOpen,
  onClose,
  localDrafts,
  onLoadLocalDraft,
  onDeleteLocalDraft,
  onLoadDbDraft,
  onNotify,
}: Props) {
  const apiClient = useApiClient();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDrafts = async () => {
      try {
        const response = await apiClient.get('/api/orders/list?status=DRAFT&limit=20');
        if (!isMounted) return;

        if (response.status >= 200 && response.status < 300) {
          setDrafts(response.data?.data || response.data?.orders || []);
        } else {
          setError('Failed to load saved drafts.');
          setDrafts([]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching drafts:', error);
        setError('Failed to load saved drafts.');
        setDrafts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDrafts();

    return () => {
      isMounted = false;
    };
  }, [apiClient, isOpen]);

  const sortedLocalDrafts = [...localDrafts].sort((a, b) => {
    const timeA = new Date(a.savedAt).getTime();
    const timeB = new Date(b.savedAt).getTime();
    const safeA = Number.isFinite(timeA) ? timeA : 0;
    const safeB = Number.isFinite(timeB) ? timeB : 0;
    return safeB - safeA;
  });

  const handleDeleteDbDraft = async (draftId: string) => {
    try {
      setDeletingId(draftId);
      const response = await apiClient.delete(`/api/orders/${draftId}/draft`);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.error || 'Failed to delete draft');
      }
      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      onNotify?.('Draft deleted');
    } catch (error) {
      console.error('Error deleting draft:', error);
      setError('Failed to delete draft.');
      onNotify?.('Failed to delete draft.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full">
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Load Draft</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Auto-saved drafts stay on this device. Saved drafts are stored in the database.
        </p>

        <div className="mt-6 max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Local Drafts (auto-saved)
            </div>
            {sortedLocalDrafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No local drafts found.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedLocalDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <button
                      onClick={() => onLoadLocalDraft(draft)}
                      className="flex-1 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {draft.itemCount} items • {formatCurrency(draft.totalCents)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getCustomerLabel(draft.customer)} • {formatRelativeTime(draft.savedAt)}
                      </div>
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteLocalDraft(draft.id);
                      }}
                      className="mr-2 mt-2 h-9 w-9 rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                      aria-label="Delete local draft"
                    >
                      <svg className="mx-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Saved Drafts (database)
            </div>
            {loading ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Loading drafts...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No saved drafts found.
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <button
                      onClick={() => onLoadDbDraft(draft)}
                      className="flex-1 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            Draft #{draft.orderNumber ?? draft.id}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {draft.customer
                              ? `${draft.customer.firstName} ${draft.customer.lastName}`
                              : 'No customer'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {draft.createdAt ? formatDraftDate(draft.createdAt) : ''}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteDbDraft(draft.id);
                      }}
                      disabled={deletingId === draft.id}
                      className="mr-2 mt-2 h-9 w-9 rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                      aria-label="Delete saved draft"
                    >
                      <svg className="mx-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
