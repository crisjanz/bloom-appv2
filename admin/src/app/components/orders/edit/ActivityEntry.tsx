import { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from '@shared/assets/icons';
import { formatCurrency } from '@shared/utils/currency';

export interface OrderTimelineEntry {
  id: string;
  type: string;
  summary: string;
  details?: Record<string, unknown>;
  actorName?: string;
  createdAt: string;
}

interface ActivityEntryProps {
  entry: OrderTimelineEntry;
}

const formatRelativeTime = (createdAt: string): string => {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return createdAt;
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(createdAt).toLocaleString();
};

const formatLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const formatDetailsValue = (key: string, value: unknown): string => {
  if (value == null) return 'None';

  const lowerKey = key.toLowerCase();
  if (
    typeof value === 'number' &&
    (lowerKey.includes('amount') || lowerKey.includes('total') || lowerKey.includes('difference'))
  ) {
    return `${formatCurrency(value)} (${value} cents)`;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatDetailsValue(key, item)).join(', ');
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(objectValue, 'from') || Object.prototype.hasOwnProperty.call(objectValue, 'to')) {
      const fromValue = formatDetailsValue(`${key}_from`, objectValue.from);
      const toValue = formatDetailsValue(`${key}_to`, objectValue.to);
      return `${fromValue} -> ${toValue}`;
    }

    return JSON.stringify(value);
  }

  return String(value);
};

const getEntryTone = (entry: OrderTimelineEntry): string => {
  const targetStatus =
    entry.type === 'STATUS_CHANGE' &&
    entry.details &&
    typeof entry.details === 'object' &&
    typeof entry.details.to === 'string'
      ? String(entry.details.to).toUpperCase()
      : null;

  if (entry.type === 'PAYMENT_RECEIVED') {
    return 'bg-green-500';
  }

  if (entry.type === 'REFUND_PROCESSED' || targetStatus === 'CANCELLED' || targetStatus === 'REJECTED') {
    return 'bg-red-500';
  }

  return 'bg-gray-400';
};

export default function ActivityEntry({ entry }: ActivityEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const toneClass = getEntryTone(entry);

  const detailRows = useMemo(() => {
    const details = entry.details;
    if (!details || typeof details !== 'object') return [];

    return Object.entries(details)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({
        key,
        label: formatLabel(key),
        value: formatDetailsValue(key, value),
      }));
  }, [entry.details]);

  return (
    <div className="py-1.5">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 text-gray-900 dark:text-white break-words">{entry.summary}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelativeTime(entry.createdAt)} · {entry.actorName ? `By ${entry.actorName}` : 'System'}
          </p>
        </div>
      </div>

      {detailRows.length > 0 && (
        <div className="mt-1 pl-4">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ChevronUpIcon className="h-3.5 w-3.5" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-3.5 w-3.5" />
                Show details
              </>
            )}
          </button>

          {expanded && (
            <div className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
              {detailRows.map((row) => (
                <p key={row.key}>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{row.label}:</span> {row.value}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
