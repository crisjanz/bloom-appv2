import { useNavigate } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Select from '@shared/ui/forms/Select';
import InputField from '@shared/ui/forms/input/InputField';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { getEventStatusColor } from '@shared/utils/statusColors';
import { formatCurrency } from '@shared/utils/currency';
// MIGRATION: Use events domain hook for better event management
import { useEventsNew } from '@shared/hooks/useEventsNew';

// Inline SVG icons
const EyeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

// Event types and status enums matching the database schema
type EventType = 'WEDDING' | 'CORPORATE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'FUNERAL' | 'GRADUATION' | 'OTHER';
type EventStatus = 'INQUIRY' | 'QUOTE_REQUESTED' | 'QUOTE_SENT' | 'QUOTE_APPROVED' | 'DEPOSIT_RECEIVED' | 'IN_PRODUCTION' | 'READY_FOR_INSTALL' | 'INSTALLED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

interface Event {
  id: string;
  eventNumber: number;
  eventType: EventType | string;
  eventName: string;
  description?: string;
  status: EventStatus | string;
  eventDate: string;
  venue: string;
  quotedAmount?: number;
  finalAmount?: number;
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    name: string;
  };
  createdAt: string;
  completedAt?: string;
}

const eventTypeOptions = [
  { value: "ALL", label: "All Types" },
  { value: "WEDDING", label: "Wedding" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "FUNERAL", label: "Funeral" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "OTHER", label: "Other" },
];

const statusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "INQUIRY", label: "Inquiry" },
  { value: "QUOTE_REQUESTED", label: "Quote Requested" },
  { value: "QUOTE_SENT", label: "Quote Sent" },
  { value: "QUOTE_APPROVED", label: "Quote Approved" },
  { value: "DEPOSIT_RECEIVED", label: "Deposit Received" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "READY_FOR_INSTALL", label: "Ready for Install" },
  { value: "INSTALLED", label: "Installed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
];

const getEventTypeLabel = (type: EventType | string): string => {
  return eventTypeOptions.find(option => option.value === type)?.label || 'Other';
};

const getStatusLabel = (value: EventStatus | string) => {
  return statusOptions.find(option => option.value === value)?.label || value;
};

const EventsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  
  // MIGRATION: Use events domain hook instead of local state
  const {
    events,
    loading,
    searching,
    error,
    statusFilter,
    typeFilter,
    searchTerm,
    updateStatusFilter,
    updateTypeFilter,
    updateSearchTerm
  } = useEventsNew();

  // MIGRATION: Events are automatically loaded by domain hook with debouncing and filtering

  const formatDate = (dateString: string) => {
    if (timezoneLoading) return dateString;
    // Extract date part first to avoid timezone conversion
    const datePart = dateString.split('T')[0];  // "2025-10-04"
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatBusinessDate(date);
  };

  const handleNewEvent = () => {
    navigate('/events/new');
  };

  const handleRowClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  // Define table columns
  const columns: ColumnDef<Event>[] = [
    {
      key: 'status',
      header: 'Status',
      className: 'w-[160px]',
      render: (event) => {
        const displayText = getStatusLabel(event.status);
        const statusColor = getEventStatusColor(event.status);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{displayText}</span>
          </div>
        );
      },
    },
    {
      key: 'eventNumber',
      header: 'Event #',
      className: 'w-[100px]',
      render: (event) => (
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
            #{event.eventNumber}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatDate(event.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'eventDate',
      header: 'Event Date',
      className: 'w-[120px]',
      render: (event) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {formatDate(event.eventDate)}
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event Name',
      className: 'w-[200px] max-w-[200px]',
      render: (event) => (
        <div className="max-w-[200px] truncate">
          <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate" title={event.eventName}>
            {event.eventName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={event.venue}>
            {event.venue}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      className: 'w-[120px]',
      render: (event) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {getEventTypeLabel(event.eventType)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      className: 'w-[140px] max-w-[140px]',
      render: (event) => {
        const customerName = `${event.customer.firstName} ${event.customer.lastName}`;
        return (
          <div className="max-w-[140px] truncate">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap" title={customerName}>
              {customerName}
            </span>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'w-[120px] text-right',
      render: (event) => (
        <div className="text-sm text-gray-900 dark:text-white whitespace-nowrap">
          {event.finalAmount != null ? (
            <span className="font-medium">{formatCurrency(event.finalAmount)}</span>
          ) : event.quotedAmount != null ? (
            <span className="text-gray-600 dark:text-gray-400">
              {formatCurrency(event.quotedAmount)}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[100px]',
      render: (event) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/events/${event.id}`);
            }}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View event"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/events/${event.id}/edit`);
            }}
            className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Edit event"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  // MIGRATION: Show domain hook errors
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage wedding and event quotes, production, and payments
          </p>
        </div>
        <button
          onClick={handleNewEvent}
          className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Event
        </button>
      </div>

      {/* Card with Filters + Table */}
      <ComponentCard>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Search Events"
              placeholder="Search by event name, customer, or venue..."
              value={searchTerm}
              onChange={(e) => updateSearchTerm(e.target.value)}
            />

            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={updateStatusFilter}
            />

            <Select
              label="Event Type"
              options={eventTypeOptions}
              value={typeFilter}
              onChange={updateTypeFilter}
            />
          </div>

          <div>
            <button
              onClick={() => {
                updateSearchTerm('');
                updateStatusFilter('ALL');
                updateTypeFilter('ALL');
              }}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Table */}
        <StandardTable
          columns={columns}
          data={events}
          loading={(loading || timezoneLoading || searching) && events.length === 0}
          emptyState={{
            message: "No events found",
          }}
          onRowClick={handleRowClick}
        />
      </ComponentCard>
    </div>
  );
};

export default EventsListPage;
