import { useEffect, useMemo, useRef } from 'react';

interface Communication {
  id: string;
  type: string;
  status?: string;
  message: string;
  recipient?: string;
  subject?: string;
  isAutomatic: boolean;
  sentVia?: string;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
  };
}

interface CommunicationTimelineProps {
  communications: Communication[];
  loading: boolean;
}

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

export default function CommunicationTimeline({ communications, loading }: CommunicationTimelineProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PHONE_CALL':
        return 'Phone Call';
      case 'SMS_SENT':
        return 'SMS Sent';
      case 'SMS_RECEIVED':
        return 'SMS Received';
      case 'EMAIL_SENT':
        return 'Email Sent';
      case 'NOTE':
        return 'Note';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const orderedCommunications = useMemo(() => {
    return [...communications].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [communications]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [orderedCommunications.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand-500"></div>
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No communications yet</p>
      </div>
    );
  }

  const renderBubble = (comm: Communication) => {
    const isIncoming = comm.type === 'SMS_RECEIVED';
    const isOutgoing = comm.type === 'SMS_SENT' || comm.type === 'EMAIL_SENT';

    if (!isIncoming && !isOutgoing) {
      return (
        <div key={comm.id} className="flex w-full">
          <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-center">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
              {getTypeLabel(comm.type)}
            </div>
            {comm.status && (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                {comm.status}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
              {comm.message}
            </div>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {formatDate(comm.createdAt)}
            </div>
          </div>
        </div>
      );
    }

    const containerClass = isOutgoing ? 'flex justify-end' : 'flex justify-start';
    const bubbleClass = isOutgoing
      ? 'max-w-[70%] bg-brand-500 text-white rounded-2xl rounded-br-sm px-4 py-2'
      : 'max-w-[70%] bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm px-4 py-2';
    const timeClass = isOutgoing ? 'text-white/70' : 'text-gray-500 dark:text-gray-400';

    const phoneLabel = comm.recipient ? formatPhone(comm.recipient) : null;

    return (
      <div key={comm.id} className={containerClass}>
        <div className={bubbleClass}>
          {comm.type === 'EMAIL_SENT' && (
            <div className="text-[11px] uppercase tracking-wide text-white/80 mb-1">
              Email Sent
            </div>
          )}
          {phoneLabel && (
            <div className={`text-[11px] mb-1 ${isOutgoing ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
              {isIncoming ? `From: ${phoneLabel}` : `To: ${phoneLabel}`}
            </div>
          )}
          {comm.subject && (
            <div className="text-xs font-semibold mb-1">
              {comm.subject}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap">
            {comm.message}
          </div>
          <div className={`text-xs mt-1 ${timeClass}`}>
            {formatDate(comm.createdAt)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversation</h3>
      <div className="space-y-3">
        {orderedCommunications.map((comm) => renderBubble(comm))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
