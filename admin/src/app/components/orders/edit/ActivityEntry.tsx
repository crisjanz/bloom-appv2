import { useMemo, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChatIcon,
  CreditCardIcon,
  DollarSignIcon,
  EnvelopeIcon,
  FileIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
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
    return 'text-green-600 dark:text-green-400';
  }

  if (entry.type === 'REFUND_PROCESSED' || targetStatus === 'CANCELLED' || targetStatus === 'REJECTED') {
    return 'text-red-600 dark:text-red-400';
  }

  return 'text-gray-600 dark:text-gray-400';
};

const getEntryIcon = (type: string) => {
  switch (type) {
    case 'STATUS_CHANGE':
      return ArrowUpIcon;
    case 'PAYMENT_STATUS_CHANGE':
      return CreditCardIcon;
    case 'PAYMENT_RECEIVED':
      return DollarSignIcon;
    case 'REFUND_PROCESSED':
      return ArrowDownIcon;
    case 'PAYMENT_ADJUSTMENT':
      return ArrowRightIcon;
    case 'ORDER_EDITED':
      return PencilIcon;
    case 'ORDER_CREATED':
      return PlusIcon;
    case 'SMS_SENT':
    case 'SMS_RECEIVED':
      return ChatIcon;
    case 'EMAIL_SENT':
      return EnvelopeIcon;
    case 'NOTE':
      return FileIcon;
    case 'PRINT':
      return PrinterIcon;
    default:
      return FileIcon;
  }
};

export default function ActivityEntry({ entry }: ActivityEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getEntryIcon(entry.type);
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 ${toneClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{entry.summary}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {entry.actorName ? `By ${entry.actorName}` : 'System'}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatRelativeTime(entry.createdAt)}
        </div>
      </div>

      {detailRows.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-brand-500 hover:text-brand-600"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
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
