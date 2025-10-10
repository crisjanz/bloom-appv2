import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@shared/ui/components/ui/table';
import Badge from '@shared/ui/components/ui/badge/Badge';
import ComponentCard from '@shared/ui/common/ComponentCard';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import InputField from '@shared/ui/forms/input/InputField';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
// MIGRATION: Use events domain hook for better event management
import { useEventsNew } from '@shared/hooks/useEventsNew';

// Event types and status enums matching the database schema
type EventType = 'WEDDING' | 'CORPORATE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'FUNERAL' | 'GRADUATION' | 'OTHER';
type EventStatus = 'INQUIRY' | 'QUOTE_REQUESTED' | 'QUOTE_SENT' | 'QUOTE_APPROVED' | 'DEPOSIT_RECEIVED' | 'IN_PRODUCTION' | 'READY_FOR_INSTALL' | 'INSTALLED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

interface Event {
  id: string;
  eventNumber: number;
  eventType: EventType;
  eventName: string;
  description?: string;
  status: EventStatus;
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

const EventStatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'INQUIRY':
      case 'QUOTE_REQUESTED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'QUOTE_SENT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'QUOTE_APPROVED':
      case 'DEPOSIT_RECEIVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'IN_PRODUCTION':
      case 'READY_FOR_INSTALL':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'INSTALLED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: EventStatus) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  return (
    <Badge className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </Badge>
  );
};

const EventTypeIcon: React.FC<{ type: EventType }> = ({ type }) => {
  const icons = {
    WEDDING: '💒',
    CORPORATE: '🏢',
    BIRTHDAY: '🎂',
    ANNIVERSARY: '💕',
    FUNERAL: '🕊️',
    GRADUATION: '🎓',
    OTHER: '🎉',
  };
  return <span className="text-lg">{icons[type]}</span>;
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

  const handleView = (id: string) => {
    navigate(`/events/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/events/${id}/edit`);
  };

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

  if (loading || timezoneLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
    <div className="p-4">
      <PageBreadcrumb pageName="Events" />
      
      <ComponentCard>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Wedding & Event Manager
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage wedding and event quotes, production, and payments
            </p>
          </div>
          <button
            onClick={handleNewEvent}
            className="inline-flex items-center px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Event
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Search */}
            <div>
              <InputField
                label="Search Events"
                placeholder="Search by event name, customer, or venue..."
                value={searchTerm}
                onChange={(e) => updateSearchTerm(e.target.value)}
                className="focus:border-[#597485] focus:ring-[#597485]/20"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <Label>Status</Label>
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={updateStatusFilter}
                placeholder="Select status"
              />
            </div>

            {/* Type Filter */}
            <div>
              <Label>Event Type</Label>
              <Select
                options={eventTypeOptions}
                value={typeFilter}
                onChange={updateTypeFilter}
                placeholder="Select event type"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                    Event
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                    Customer
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                    Event Date
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                    Amount
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searching && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#597485] mr-2"></div>
                        Searching...
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!searching && events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <p className="text-lg font-medium mb-1">No events found</p>
                        <p className="text-sm">Create your first event to get started</p>
                        <button
                          onClick={handleNewEvent}
                          className="mt-3 inline-flex items-center px-3 py-2 bg-[#597485] hover:bg-[#4e6575] text-white text-sm rounded-lg transition-colors"
                        >
                          Create New Event
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!searching && events.map((event) => (
                  <TableRow 
                    key={event.id}
                    className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => handleView(event.id)}
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <EventTypeIcon type={event.eventType} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            #{event.eventNumber} - {event.eventName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {event.venue}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {event.customer.firstName} {event.customer.lastName}
                        </div>
                        {event.customer.phone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {event.customer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="text-gray-900 dark:text-white">
                        {formatDate(event.eventDate)}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <EventStatusBadge status={event.status} />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="text-gray-900 dark:text-white">
                        {event.finalAmount !== null ? (
                          <span className="font-medium">${event.finalAmount?.toFixed(2) || '0.00'}</span>
                        ) : event.quotedAmount !== null ? (
                          <span className="text-gray-600 dark:text-gray-400">${event.quotedAmount?.toFixed(2) || '0.00'} (quoted)</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">No quote</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(event.id);
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(event.id);
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Edit
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
};

export default EventsListPage;