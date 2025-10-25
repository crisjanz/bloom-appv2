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

export default function CommunicationTimeline({ communications, loading }: CommunicationTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'PHONE_CALL':
        return '📞';
      case 'SMS_SENT':
      case 'SMS_RECEIVED':
        return '💬';
      case 'EMAIL_SENT':
        return '📧';
      case 'NOTE':
        return '📝';
      default:
        return '💬';
    }
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#597485]"></div>
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

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Communication History</h3>
      <div className="space-y-4">
        {communications.map((comm) => (
          <div
            key={comm.id}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getIcon(comm.type)}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getTypeLabel(comm.type)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(comm.createdAt)} · {comm.employee?.name || 'System'}
                  </p>
                </div>
              </div>
              {comm.isAutomatic && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                  Auto
                </span>
              )}
            </div>

            {comm.type === 'PHONE_CALL' && comm.status && (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status: {comm.status}
              </p>
            )}

            {comm.recipient && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                To: {comm.recipient}
              </p>
            )}

            {comm.subject && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Subject: {comm.subject}
              </p>
            )}

            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {comm.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
