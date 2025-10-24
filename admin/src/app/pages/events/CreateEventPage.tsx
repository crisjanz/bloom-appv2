import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '@shared/ui/common/ComponentCard';
import PageBreadcrumb from '@shared/ui/common/PageBreadCrumb';
import InputField from '@shared/ui/forms/input/InputField';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import TextArea from '@shared/ui/forms/input/TextArea';
import DatePicker from '@shared/ui/forms/date-picker';
// MIGRATION: Use domain hooks for better customer and event management
import { useCustomerSearch } from '@domains/customers/hooks/useCustomerService.ts';
import { useEventsNew } from '@shared/hooks/useEventsNew';

// Event types matching the database schema
const eventTypeOptions = [
  { value: "WEDDING", label: "Wedding" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "FUNERAL", label: "Funeral" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "OTHER", label: "Other" },
];

const serviceTypeOptions = [
  { value: "FULL_SERVICE", label: "Full Service" },
  { value: "DELIVERY_ONLY", label: "Delivery Only" },
  { value: "PICKUP", label: "Pickup" },
  { value: "CONSULTATION", label: "Consultation Only" },
];

// MIGRATION: Customer interface now comes from domain layer

interface Employee {
  id: string;
  name: string;
}

interface EventItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productionNotes?: string;
}

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // MIGRATION: Use domain hooks for event creation and customer search
  const { createEvent, loading, error: eventError } = useEventsNew();
  const { 
    query: customerSearch, 
    setQuery: setCustomerSearch, 
    results: customerResults, 
    isSearching 
  } = useCustomerSearch();
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    eventType: '',
    eventName: '',
    description: '',
    customerId: '',
    eventDate: '',
    setupDate: '',
    setupTime: '',
    venue: '',
    venueAddress: '',
    contactPerson: '',
    contactPhone: '',
    estimatedGuests: '',
    serviceType: '',
    quotedAmount: '',
    employeeId: '',
    designNotes: '',
    setupNotes: '',
    internalNotes: '',
    customerNotes: '',
  });

  const [items, setItems] = useState<EventItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  // MIGRATION: Customer search is now handled by domain hook with automatic debouncing
  useEffect(() => {
    // Show dropdown when we have search results
    if (customerSearch && customerResults.length > 0) {
      setShowCustomerDropdown(true);
    } else if (!customerSearch) {
      setShowCustomerDropdown(false);
    }
  }, [customerSearch, customerResults]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
  };

  const addItem = () => {
    const newItem: EventItem = {
      id: `temp-${Date.now()}`,
      category: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      productionNotes: '',
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof EventItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate total when quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.eventType) newErrors.eventType = 'Event type is required';
    if (!formData.eventName) newErrors.eventName = 'Event name is required';
    if (!formData.customerId) newErrors.customerId = 'Customer is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    if (!formData.venue) newErrors.venue = 'Venue is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // MIGRATION: Use domain service for event creation
      const eventData = {
        eventType: formData.eventType as any, // EventType enum
        eventName: formData.eventName,
        description: formData.description,
        customerId: formData.customerId,
        eventDate: formData.eventDate,
        setupDate: formData.setupDate,
        setupTime: formData.setupTime,
        venue: formData.venue,
        venueAddress: formData.venueAddress,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        estimatedGuests: formData.estimatedGuests ? parseInt(formData.estimatedGuests) : undefined,
        serviceType: formData.serviceType as any, // ServiceType enum
        quotedAmount: formData.quotedAmount ? parseFloat(formData.quotedAmount) : undefined,
        employeeId: formData.employeeId,
        designNotes: formData.designNotes,
        setupNotes: formData.setupNotes,
        internalNotes: formData.internalNotes,
        customerNotes: formData.customerNotes,
        items: items
          .filter(item => item.category && item.description)
          .map(item => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productionNotes: item.productionNotes
          }))
      };

      const createdEvent = await createEvent(eventData);
      navigate(`/events/${createdEvent.id}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create event' });
    }
  };

  const totalQuotedAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="p-4">
      <PageBreadcrumb pageTitle="Create New Event" />
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Event Information */}
          <ComponentCard>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Event Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Basic information about the event
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* MIGRATION: Show domain hook errors */}
              {(errors.general || eventError) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {errors.general || eventError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Event Type *</Label>
                  <Select
                    options={eventTypeOptions}
                    value={formData.eventType}
                    onChange={(value) => handleInputChange('eventType', value)}
                    placeholder="Select event type"
                  />
                  {errors.eventType && <p className="text-red-500 text-sm mt-1">{errors.eventType}</p>}
                </div>

                <div>
                  <Label>Service Type</Label>
                  <Select
                    options={serviceTypeOptions}
                    value={formData.serviceType}
                    onChange={(value) => handleInputChange('serviceType', value)}
                    placeholder="Select service type"
                  />
                </div>
              </div>

              <div>
                <InputField
                  label="Event Name *"
                  placeholder="e.g., Sarah & Mike's Wedding, Annual Corporate Gala"
                  value={formData.eventName}
                  onChange={(e) => handleInputChange('eventName', e.target.value)}
                  error={errors.eventName}
                />
              </div>

              <div>
                <Label>Description</Label>
                <TextArea
                  placeholder="Additional event details..."
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                />
              </div>
            </div>
          </ComponentCard>

          {/* Customer Selection */}
          <ComponentCard>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Customer Information
              </h3>
            </div>
            
            <div className="p-6">
              <div className="relative">
                <InputField
                  label="Customer *"
                  placeholder="Search for customer by name, email, or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  error={errors.customerId}
                />
                
                {/* MIGRATION: Loading state */}
                {isSearching && customerSearch.length >= 3 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#597485]"></div>
                      <span className="text-gray-500 text-sm">Searching customers...</span>
                    </div>
                  </div>
                )}
                
                {/* MIGRATION: Updated to use domain hook results */}
                {showCustomerDropdown && !isSearching && customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {customer.email} • {customer.phone}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* MIGRATION: Show "no results" message */}
                {customerSearch.length >= 3 && !isSearching && customerResults.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-center">
                    <div className="text-gray-500 text-sm">
                      No customers found matching "{customerSearch}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ComponentCard>

          {/* Event Schedule & Venue */}
          <ComponentCard>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Schedule & Venue
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    id="event-date"
                    label="Event Date *"
                    placeholder="Select event date"
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        handleInputChange('eventDate', selectedDates[0].toISOString().split('T')[0]);
                      }
                    }}
                  />
                  {errors.eventDate && <p className="text-red-500 text-sm mt-1">{errors.eventDate}</p>}
                </div>

                <div>
                  <DatePicker
                    id="setup-date"
                    label="Setup Date"
                    placeholder="Select setup date"
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        handleInputChange('setupDate', selectedDates[0].toISOString().split('T')[0]);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <InputField
                    label="Setup Time"
                    placeholder="e.g., 8:00 AM"
                    value={formData.setupTime}
                    onChange={(e) => handleInputChange('setupTime', e.target.value)}
                  />
                </div>

                <div>
                  <InputField
                    label="Estimated Guests"
                    type="number"
                    placeholder="100"
                    value={formData.estimatedGuests}
                    onChange={(e) => handleInputChange('estimatedGuests', e.target.value)}
                  />
                </div>

                <div>
                  <InputField
                    label="Quoted Amount"
                    type="number"
                    step={0.01}
                    placeholder="0.00"
                    value={formData.quotedAmount}
                    onChange={(e) => handleInputChange('quotedAmount', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <InputField
                  label="Venue *"
                  placeholder="e.g., Grand Ballroom, St. Mary's Church"
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  error={errors.venue}
                />
              </div>

              <div>
                <Label>Venue Address</Label>
                <TextArea
                  placeholder="Full venue address..."
                  value={formData.venueAddress}
                  onChange={(value) => handleInputChange('venueAddress', value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <InputField
                    label="Contact Person"
                    placeholder="Venue coordinator name"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  />
                </div>

                <div>
                  <InputField
                    label="Contact Phone"
                    placeholder="Venue phone number"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </ComponentCard>

          {/* Event Items */}
          <ComponentCard>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                    Event Items
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Items and services for this event
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-2 bg-[#597485] hover:bg-[#4e6575] text-white text-sm rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No items added yet</p>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-2 text-[#597485] hover:text-[#4e6575] text-sm"
                  >
                    Add your first item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Item #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <input
                            type="text"
                            placeholder="e.g., Bridal Bouquet, Centerpiece"
                            value={item.category}
                            onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-[#597485] focus:ring-[#597485]/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Quantity</Label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-[#597485] focus:ring-[#597485]/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                            />
                          </div>
                          
                          <div>
                            <Label>Unit Price</Label>
                            <input
                              type="number"
                              step={0.01}
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-[#597485] focus:ring-[#597485]/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Label>Description</Label>
                        <textarea
                          placeholder="Detailed description of the item..."
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-[#597485] focus:ring-[#597485]/20 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                        />
                      </div>
                      
                      <div className="mt-4 text-right">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          Total: ${item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {items.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-right">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        Quote Total: ${totalQuotedAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ComponentCard>

          {/* Staff & Notes */}
          <ComponentCard>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Staff Assignment & Notes
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <Label>Assigned Employee</Label>
                <Select
                  options={employees.map(emp => ({ value: emp.id, label: emp.name }))}
                  value={formData.employeeId}
                  onChange={(value) => handleInputChange('employeeId', value)}
                  placeholder="Select staff member"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Design Notes</Label>
                  <TextArea
                    placeholder="Design and production instructions..."
                    value={formData.designNotes}
                    onChange={(value) => handleInputChange('designNotes', value)}
                  />
                </div>

                <div>
                  <Label>Setup Notes</Label>
                  <TextArea
                    placeholder="Setup and installation notes..."
                    value={formData.setupNotes}
                    onChange={(value) => handleInputChange('setupNotes', value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Notes</Label>
                  <TextArea
                    placeholder="Notes from customer..."
                    value={formData.customerNotes}
                    onChange={(value) => handleInputChange('customerNotes', value)}
                  />
                </div>

                <div>
                  <Label>Internal Notes</Label>
                  <TextArea
                    placeholder="Private staff notes..."
                    value={formData.internalNotes}
                    onChange={(value) => handleInputChange('internalNotes', value)}
                  />
                </div>
              </div>
            </div>
          </ComponentCard>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#597485] hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;