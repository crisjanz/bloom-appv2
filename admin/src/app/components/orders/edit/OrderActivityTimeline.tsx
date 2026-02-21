import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from '@shared/hooks/useApiClient';
import ActivityEntry, { OrderTimelineEntry } from './ActivityEntry';

interface OrderActivityTimelineProps {
  orderId: string;
  refreshToken?: number;
}

interface ActivityResponse {
  success: boolean;
  entries: OrderTimelineEntry[];
  pagination?: {
    limit: number;
    hasMore: boolean;
    nextBefore: string | null;
  };
  error?: string;
}

const PAGE_SIZE = 20;

const mergeEntries = (existing: OrderTimelineEntry[], incoming: OrderTimelineEntry[]) => {
  const seen = new Set<string>();
  const merged: OrderTimelineEntry[] = [];

  [...existing, ...incoming].forEach((entry) => {
    if (seen.has(entry.id)) {
      return;
    }

    seen.add(entry.id);
    merged.push(entry);
  });

  return merged;
};

export default function OrderActivityTimeline({ orderId, refreshToken = 0 }: OrderActivityTimelineProps) {
  const apiClient = useApiClient();
  const [entries, setEntries] = useState<OrderTimelineEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(
    async (before: string | null, append: boolean) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (before) {
        params.set('before', before);
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { data, status } = await apiClient.get(`/api/orders/${orderId}/activity?${params.toString()}`);
        const response = data as ActivityResponse;

        if (status >= 400 || !response?.success || !Array.isArray(response.entries)) {
          throw new Error(response?.error || 'Failed to load activity');
        }

        setEntries((prev) => (append ? mergeEntries(prev, response.entries) : response.entries));
        setHasMore(Boolean(response.pagination?.hasMore));
        setNextBefore(response.pagination?.nextBefore || null);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load activity';
        setError(message);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [apiClient, orderId]
  );

  useEffect(() => {
    setEntries([]);
    setHasMore(false);
    setNextBefore(null);
    void loadActivity(null, false);
  }, [loadActivity, refreshToken]);

  const handleLoadMore = () => {
    if (!nextBefore || loadingMore) {
      return;
    }

    void loadActivity(nextBefore, true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-300 border-t-brand-500" />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400">
        <p>{error}</p>
        <button
          type="button"
          className="mt-2 text-brand-500 hover:text-brand-600"
          onClick={() => void loadActivity(null, false)}
        >
          Try again
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <ActivityEntry key={entry.id} entry={entry} />
      ))}

      {error && entries.length > 0 && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {hasMore && (
        <div>
          <button
            type="button"
            className="text-sm text-brand-500 hover:text-brand-600 disabled:text-gray-400"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
