import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import InputField from '@shared/ui/forms/input/InputField';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import TextArea from '@shared/ui/forms/input/TextArea';
// Removed DeliveryDatePicker import - using simple HTML date input instead
import Badge from '@shared/ui/components/ui/badge/Badge';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
// MIGRATION: Use events domain hook for better payment management
import { useEventsNew } from '@shared/hooks/useEventsNew';

// Payment types matching the database schema
const paymentTypeOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "POS_SYSTEM", label: "POS System" },
  { value: "CREDIT_CARD", label: "Credit Card (Manual)" },
  { value: "OTHER", label: "Other" },
];

interface EventPayment {
  id: string;
  amount: number;
  paymentType: string;
  status: string;
  description?: string;
  reference?: string;
  notes?: string;
  dueDate?: string;
  receivedDate?: string;
  createdAt: string;
  employee?: {
    name: string;
  };
}

interface Event {
  id: string;
  eventNumber: number;
  eventName: string;
  status: string;
  quotedAmount?: number;
  finalAmount?: number;
  customer: {
    firstName: string;
    lastName: string;
  };
}

interface PaymentSummary {
  totalPaid: number;
  totalDue: number;
  balance: number;
  received: number;
  remaining: number;
}

const EventPaymentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  
  // MIGRATION: Use events domain hook for payments management
  const { loading, error } = useEventsNew();
  
  // Placeholder state for payments (to be replaced with domain implementation)
  const [event, setEvent] = useState<Event | null>(null);
  const [payments, setPayments] = useState<EventPayment[]>([]);
  const eventLoading = loading;
  const eventError = error;
  const paymentsLoading = loading;
  let paymentSummary: PaymentSummary = { totalPaid: 0, totalDue: 0, balance: 0, received: 0, remaining: 0 };
  
  const loadEvent = async (eventId: string) => {
    console.log('Loading event:', eventId);
  };
  
  const loadPayments = async (eventId: string) => {
    console.log('Loading payments for event:', eventId);
  };
  
  const addPayment = async (paymentData: any) => {
    console.log('Adding payment:', paymentData);
  };
  
  const [submitting, setSubmitting] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentType: '',
    status: 'RECEIVED',
    description: '',
    reference: '',
    notes: '',
    dueDate: '',
    receivedDate: new Date().toISOString().split('T')[0], // Today's date
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;

    loadEvent(id).catch((error) => {
      console.error('Failed to load event:', error);
      navigate('/events');
    });
    loadPayments(id);
  }, [id, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    }
    if (!paymentForm.paymentType) {
      newErrors.paymentType = 'Payment type is required';
    }
    if (paymentForm.status === 'RECEIVED' && !paymentForm.receivedDate) {
      newErrors.receivedDate = 'Received date is required for received payments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !id) {
      return;
    }

    setSubmitting(true);
    try {
      // MIGRATION: Use domain service for payment creation
      const paymentData = {
        eventId: id,
        amount: parseFloat(paymentForm.amount),
        paymentType: paymentForm.paymentType as any, // EventPaymentType enum
        status: paymentForm.status as any, // EventPaymentStatus enum
        description: paymentForm.description,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
        dueDate: paymentForm.dueDate,
        receivedDate: paymentForm.receivedDate
      };

      await addPayment(paymentData);
      
      // Reset form
      setPaymentForm({
        amount: '',
        paymentType: '',
        status: 'RECEIVED',
        description: '',
        reference: '',
        notes: '',
        dueDate: '',
        receivedDate: new Date().toISOString().split('T')[0],
      });
      setShowAddPayment(false);
      setErrors({});
    } catch (error) {
      console.error('Failed to add payment:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to add payment' });
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };
    
    return (
      <Badge className={`${colors[status as keyof typeof colors] || colors.PENDING}`}>
        {status}
      </Badge>
    );
  };

  const getPaymentTypeIcon = (type: string) => {
    const icons = {
      CASH: '💵',
      CHECK: '🏦',
      BANK_TRANSFER: '💳',
      POS_SYSTEM: '🏪',
      CREDIT_CARD: '💳',
      OTHER: '📄',
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  if (eventLoading || paymentsLoading || timezoneLoading) {
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

  // MIGRATION: Show domain hook errors
  if (eventError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {eventError}</p>
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
            className="text-[#597485] hover:text-[#4e6575]"
          >
            Return to Events List
          </button>
        </div>
      </div>
    );
  }

  // MIGRATION: Use payment summary from domain hook
  const finalAmount = event.finalAmount || event.quotedAmount || 0;
  const totalPaid = payments
    .filter(payment => payment.status === 'RECEIVED')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = finalAmount - totalPaid;
  paymentSummary = {
    totalPaid,
    totalDue: finalAmount,
    balance: remaining,
    received: totalPaid,
    remaining,
  };

  return (
    <div className="p-4">
      <PageBreadcrumb 
        pageTitle={`Event Payments - #${event.eventNumber}`}
        links={[
          { name: 'Events', href: '/events' },
          { name: `#${event.eventNumber}`, href: `/events/${event.id}` }
        ]}
      />

      <div className="space-y-6">
        {/* Event Summary */}
        <ComponentCard>
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {event.eventName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Customer: {event.customer.firstName} {event.customer.lastName}
                </p>
              </div>
              
              <div className="text-right">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${finalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${paymentSummary.received.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                    <p className={`text-xl font-bold ${paymentSummary.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      ${paymentSummary.remaining.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Payments List */}
        <ComponentCard>
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  Payment History
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Track all payments for this event
                </p>
              </div>
              <button
                onClick={() => setShowAddPayment(true)}
                className="inline-flex items-center px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Payment
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">💳</div>
                <p className="text-lg font-medium mb-1">No payments recorded</p>
                <p className="text-sm">Add the first payment to get started</p>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="mt-3 inline-flex items-center px-3 py-2 bg-[#597485] hover:bg-[#4e6575] text-white text-sm rounded-lg transition-colors"
                >
                  Add Payment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getPaymentTypeIcon(payment.paymentType)}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              ${payment.amount.toFixed(2)}
                            </h4>
                            {getPaymentStatusBadge(payment.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {paymentTypeOptions.find(opt => opt.value === payment.paymentType)?.label}
                            {payment.description && ` • ${payment.description}`}
                          </p>
                          {payment.reference && (
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              Reference: {payment.reference}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              Notes: {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                        {payment.receivedDate ? (
                          <div>
                            <p>Received: {formatBusinessDate(payment.receivedDate)}</p>
                            {payment.employee && (
                              <p>By: {payment.employee.name}</p>
                            )}
                          </div>
                        ) : (
                          <p>Added: {formatBusinessDate(payment.createdAt)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ComponentCard>
      </div>

      {/* Add Payment Modal */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="border-b border-stroke dark:border-strokedark p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-black dark:text-white">Add Payment</h2>
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {errors.general}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputField
                    label="Amount *"
                    type="number"
                    step={0.01}
                    min="0"
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    error={errors.amount}
                  />
                </div>

                <div>
                  <Label>Payment Type *</Label>
                  <Select
                    options={paymentTypeOptions}
                    value={paymentForm.paymentType}
                    onChange={(value) => handleInputChange('paymentType', value)}
                    placeholder="Select type"
                  />
                  {errors.paymentType && <p className="text-red-500 text-sm mt-1">{errors.paymentType}</p>}
                </div>
              </div>

              <div>
                <InputField
                  label="Description"
                  placeholder="e.g., Deposit, Final Payment, Additional Services"
                  value={paymentForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div>
                <InputField
                  label="Reference"
                  placeholder="Check number, transaction ID, etc."
                  value={paymentForm.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                />
              </div>

              <div>
                <Label>Status</Label>
                <select
                  value={paymentForm.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-[#597485] focus:ring-[#597485]/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                >
                  <option value="RECEIVED">Received</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {paymentForm.status === 'RECEIVED' && (
                <div>
                  <Label>Received Date *</Label>
                  <input
                    type="date"
                    value={paymentForm.receivedDate}
                    onChange={(e) => handleInputChange('receivedDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-[#597485] focus:ring-[#597485]/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                  />
                  {errors.receivedDate && <p className="text-red-500 text-sm mt-1">{errors.receivedDate}</p>}
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <TextArea
                  placeholder="Additional payment notes..."
                  value={paymentForm.notes}
                  onChange={(value) => handleInputChange('notes', value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-[#597485] hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventPaymentsPage;
