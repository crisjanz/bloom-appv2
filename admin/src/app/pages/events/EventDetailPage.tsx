import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import Badge from '@shared/ui/components/ui/badge/Badge';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { formatPhoneDisplay } from '@shared/ui/forms/PhoneInput';

// Types matching the database schema
type EventType = 'WEDDING' | 'CORPORATE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'FUNERAL' | 'GRADUATION' | 'OTHER';
type EventStatus = 'INQUIRY' | 'QUOTE_REQUESTED' | 'QUOTE_SENT' | 'QUOTE_APPROVED' | 'DEPOSIT_RECEIVED' | 'IN_PRODUCTION' | 'READY_FOR_INSTALL' | 'INSTALLED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

interface EventDetail {
  id: string;
  eventNumber: number;
  eventType: EventType;
  eventName: string;
  description?: string;
  status: EventStatus;
  eventDate: string;
  setupDate?: string;
  setupTime?: string;
  venue: string;
  venueAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  estimatedGuests?: number;
  serviceType?: string;
  quotedAmount?: number;
  finalAmount?: number;
  designNotes?: string;
  setupNotes?: string;
  internalNotes?: string;
  customerNotes?: string;
  lastContactDate?: string;
  quoteEmailSent: boolean;
  quoteEmailDate?: string;
  createdAt: string;
  completedAt?: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productionNotes?: string;
    isCompleted: boolean;
    completedAt?: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentType: string;
    status: string;
    description?: string;
    reference?: string;
    receivedDate?: string;
    createdAt: string;
    employee?: {
      name: string;
    };
  }>;
}

const statusOptions = [
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
  return <span className="text-2xl">{icons[type]}</span>;
};

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      const data = await response.json();

      if (data.success) {
        setEvent(data.event);
      } else {
        console.error('Failed to fetch event:', data.error);
        navigate('/events');
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (timezoneLoading) return dateString;
    // Extract date part first to avoid timezone conversion
    const datePart = dateString.split('T')[0];  // "2025-10-04"
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatBusinessDate(date);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !event) return;

    setStatusUpdating(true);
    try {
      const response = await fetch(`/api/events/${event.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEvent(prev => prev ? { ...prev, status: newStatus as EventStatus } : null);
        setShowStatusModal(false);
        setNewStatus('');
        setStatusNotes('');
      } else {
        console.error('Failed to update status:', data.error);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || timezoneLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Event not found</h2>
          <button
            onClick={() => navigate('/events')}
            className="text-brand-500 hover:text-brand-600"
          >
            Return to Events List
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = event.payments
    .filter(payment => payment.status === 'RECEIVED')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const finalAmount = event.finalAmount || event.quotedAmount || 0;
  const remainingBalance = finalAmount - totalPaid;

  return (
    <div className="p-4">
      <PageBreadcrumb 
        pageTitle={`Event #${event.eventNumber}`}
        links={[{ name: 'Events', href: '/events' }]}
      />

      <div className="space-y-6">
        {/* Event Header */}
        <ComponentCard>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <EventTypeIcon type={event.eventType} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    #{event.eventNumber} - {event.eventName}
                  </h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <EventStatusBadge status={event.status} />
                    <span className="text-gray-600 dark:text-gray-400">
                      📍 {event.venue}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      📅 {formatDate(event.eventDate)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Update Status
                </button>
                <button
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                >
                  Edit Event
                </button>
              </div>
            </div>
            
            {event.description && (
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {event.description}
              </p>
            )}
          </div>
        </ComponentCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <ComponentCard>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Customer Information
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.customer.firstName} {event.customer.lastName}
                    </p>
                  </div>
                  
                  {event.customer.email && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.customer.email}
                      </p>
                    </div>
                  )}
                  
                  {event.customer.phone && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatPhoneDisplay(event.customer.phone)}
                      </p>
                    </div>
                  )}
                  
                  {event.employee && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Staff</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.employee.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ComponentCard>

            {/* Event Items */}
            <ComponentCard>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Event Items
                </h3>
              </div>
              
              <div className="p-6">
                {event.items.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No items added to this event yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {event.items.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {item.category}
                              </h4>
                              {item.isCompleted && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  ✓ Completed
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {item.description}
                            </p>
                            {item.productionNotes && (
                              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                <strong>Production Notes:</strong> {item.productionNotes}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.quantity} × ${item.unitPrice.toFixed(2)}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ${item.totalPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        Total: ${event.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ComponentCard>

            {/* Notes */}
            {(event.designNotes || event.setupNotes || event.customerNotes || event.internalNotes) && (
              <ComponentCard>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                    Notes
                  </h3>
                </div>
                
                <div className="p-6 space-y-4">
                  {event.designNotes && (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white mb-2">Design Notes</p>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {event.designNotes}
                      </p>
                    </div>
                  )}
                  
                  {event.setupNotes && (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white mb-2">Setup Notes</p>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {event.setupNotes}
                      </p>
                    </div>
                  )}
                  
                  {event.customerNotes && (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white mb-2">Customer Notes</p>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {event.customerNotes}
                      </p>
                    </div>
                  )}
                  
                  {event.internalNotes && (
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white mb-2">Internal Notes</p>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {event.internalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </ComponentCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Details */}
            <ComponentCard>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Event Details
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Event Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(event.eventDate)}
                  </p>
                </div>
                
                {event.setupDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Setup Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(event.setupDate)}
                      {event.setupTime && ` at ${event.setupTime}`}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Venue</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {event.venue}
                  </p>
                  {event.venueAddress && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {event.venueAddress}
                    </p>
                  )}
                </div>
                
                {(event.contactPerson || event.contactPhone) && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Venue Contact</p>
                    {event.contactPerson && (
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.contactPerson}
                      </p>
                    )}
                    {event.contactPhone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.contactPhone}
                      </p>
                    )}
                  </div>
                )}
                
                {event.estimatedGuests && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Guests</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.estimatedGuests}
                    </p>
                  </div>
                )}
                
                {event.serviceType && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Service Type</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.serviceType}
                    </p>
                  </div>
                )}
              </div>
            </ComponentCard>

            {/* Payment Summary */}
            <ComponentCard>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Payment Summary
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quoted Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${event.quotedAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                
                {event.finalAmount && event.finalAmount !== event.quotedAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Final Amount</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${event.finalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Paid</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ${totalPaid.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <span className="font-medium text-gray-900 dark:text-white">Remaining Balance</span>
                  <span className={`font-bold ${remainingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ${remainingBalance.toFixed(2)}
                  </span>
                </div>
                
                <button
                  onClick={() => navigate(`/events/${event.id}/payments`)}
                  className="w-full mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                >
                  Manage Payments
                </button>
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-stroke dark:border-strokedark p-6">
              <h2 className="text-xl font-bold text-black dark:text-white">Update Event Status</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-500 focus:ring-brand-500/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                >
                  <option value="">Select new status</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-500 focus:ring-brand-500/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                />
              </div>
            </div>
            
            <div className="border-t border-stroke dark:border-strokedark p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || statusUpdating}
                  className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  {statusUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;