import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@shared/hooks/useApiClient";
import { Link } from "react-router-dom";

interface DuplicateCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  orderCount: number;
  createdAt: string;
}

interface CustomerAddress {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string | null;
  company: string | null;
  label: string | null;
  customerId: string;
  orderCount: number;
}

interface AddressReviewData {
  targetCustomerId: string;
  sourceCustomerIds: string[];
  addresses: CustomerAddress[];
}

interface DuplicateGroup {
  id: string;
  confidence: number;
  matchType: string;
  customers: DuplicateCustomer[];
  suggestedTarget: string;
  reason: string;
}

interface DuplicatesResponse {
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  threshold: number;
}

export default function DuplicatesPage() {
  const apiClient = useApiClient();

  const [duplicates, setDuplicates] = useState<DuplicatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [mergingGroupId, setMergingGroupId] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, Set<string>>>({}); // Track which customers to merge per group
  const [addressReviewGroup, setAddressReviewGroup] = useState<DuplicateGroup | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressReviewData, setAddressReviewData] = useState<AddressReviewData | null>(null);
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(
    () => {
      const saved = localStorage.getItem('dismissedDuplicateGroups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
  );

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/customers/find-duplicates?threshold=${threshold}`
      );

      if (response.status === 404) {
        console.error('Duplicate detection endpoint not found. Backend may need restart.');
        alert('Duplicate detection feature is not available. Please restart the backend server.');
        return;
      }

      const data = response.data as DuplicatesResponse;

      if (!data || !data.duplicateGroups) {
        console.error('Invalid response from duplicates API:', data);
        alert('Received invalid response from server.');
        return;
      }

      setDuplicates(data);

      // Initialize suggested targets and select all customers by default
      const targets: Record<string, string> = {};
      const customerSelections: Record<string, Set<string>> = {};
      data.duplicateGroups.forEach(group => {
        targets[group.id] = group.suggestedTarget;
        // Select all customers in the group by default
        customerSelections[group.id] = new Set(group.customers.map(c => c.id));
      });
      setSelectedTargets(targets);
      setSelectedCustomers(customerSelections);
    } catch (error) {
      console.error('Failed to load duplicates:', error);
      alert('Failed to load duplicate customers. Please restart the backend server and try again.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, threshold]);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  const handleDismissGroup = (group: DuplicateGroup) => {
    // Create a stable ID based on customer IDs (sorted to ensure consistency)
    const customerIds = group.customers.map(c => c.id).sort().join('-');
    const newDismissed = new Set(dismissedGroups);
    newDismissed.add(customerIds);
    setDismissedGroups(newDismissed);

    // Save to localStorage
    localStorage.setItem('dismissedDuplicateGroups', JSON.stringify(Array.from(newDismissed)));

    showNotification('info', 'Group marked as "Not Duplicates" and hidden from list');
  };

  const handleDeleteGroup = async (group: DuplicateGroup) => {
    if (!confirm(`Delete all ${group.customers.length} customers in this group? This cannot be undone.`)) {
      return;
    }

    try {
      const customerIds = group.customers.map(c => c.id);

      for (const customerId of customerIds) {
        await apiClient.delete(`/api/customers/${customerId}`);
      }

      showNotification('success', `Deleted ${group.customers.length} customer(s) successfully!`);

      // Remove group from UI
      if (duplicates) {
        const updatedGroups = duplicates.duplicateGroups.filter(g => g.id !== group.id);
        setDuplicates({
          ...duplicates,
          duplicateGroups: updatedGroups,
          totalDuplicates: updatedGroups.length,
        });
      }
    } catch (error) {
      console.error('Failed to delete customers:', error);
      showNotification('error', 'Failed to delete customers. Please try again.');
    }
  };

  const handleDeleteCustomer = async (customerId: string, groupId: string) => {
    if (!confirm('Delete this customer? This cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/customers/${customerId}`);
      showNotification('success', 'Customer deleted successfully!');

      // Remove customer from group in UI
      if (duplicates) {
        const updatedGroups = duplicates.duplicateGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              customers: g.customers.filter(c => c.id !== customerId),
            };
          }
          return g;
        }).filter(g => g.customers.length > 1); // Remove groups with less than 2 customers

        setDuplicates({
          ...duplicates,
          duplicateGroups: updatedGroups,
          totalDuplicates: updatedGroups.length,
        });
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
      showNotification('error', 'Failed to delete customer. Please try again.');
    }
  };

  const clearDismissed = () => {
    setDismissedGroups(new Set());
    localStorage.removeItem('dismissedDuplicateGroups');
    showNotification('info', 'All dismissed groups are now visible again');
  };

  const handleMergeGroup = async (group: DuplicateGroup) => {
    const targetId = selectedTargets[group.id];
    if (!targetId) {
      showNotification('error', 'Please select which customer to keep');
      return;
    }

    // Only merge selected customers
    const selectedIds = selectedCustomers[group.id] || new Set(group.customers.map(c => c.id));

    // Ensure target is selected
    if (!selectedIds.has(targetId)) {
      showNotification('error', 'Target customer must be included in merge');
      return;
    }

    // Require at least 2 customers selected
    if (selectedIds.size < 2) {
      showNotification('error', 'Please select at least 2 customers to merge');
      return;
    }

    const sourceIds = Array.from(selectedIds).filter(id => id !== targetId);

    const targetCustomer = group.customers.find(c => c.id === targetId);
    if (!targetCustomer) return;

    // Fetch addresses for all customers
    setLoadingAddresses(true);
    setAddressReviewGroup(group);

    try {
      const allCustomerIds = [targetId, ...sourceIds];
      const addressPromises = allCustomerIds.map(id =>
        apiClient.get(`/api/customers/${id}`)
      );

      const responses = await Promise.all(addressPromises);
      const allAddresses: CustomerAddress[] = [];

      for (const response of responses) {
        const customer = response.data;
        if (customer.addresses && Array.isArray(customer.addresses)) {
          allAddresses.push(...customer.addresses.map((addr: any) => ({
            ...addr,
            customerId: customer.id,
            orderCount: 0 // We'll need to add this to the API if needed
          })));
        }
      }

      setAddressReviewData({
        targetCustomerId: targetId,
        sourceCustomerIds: sourceIds,
        addresses: allAddresses
      });

      // Pre-select all addresses by default
      setSelectedAddresses(new Set(allAddresses.map(a => a.id)));

    } catch (error) {
      console.error('Failed to load addresses:', error);
      showNotification('error', 'Failed to load addresses. Please try again.');
      setAddressReviewGroup(null);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const executeMerge = async () => {
    if (!addressReviewData || !addressReviewGroup) return;

    setMergingGroupId(addressReviewGroup.id);

    try {
      const response = await apiClient.post('/api/customers/merge', {
        sourceIds: addressReviewData.sourceCustomerIds,
        targetId: addressReviewData.targetCustomerId,
        keepAddressIds: Array.from(selectedAddresses)
      });
      const result = response.data;

      showNotification(
        'success',
        `Successfully merged ${result.customersMerged} customer(s)! ${result.ordersMerged} orders, ${result.addressesMerged} addresses, and ${result.transactionsMerged} transactions transferred.`
      );

      // Close modal and remove merged group from UI without re-running detection
      setAddressReviewGroup(null);
      setAddressReviewData(null);
      setSelectedAddresses(new Set());

      // Update or remove the group
      if (duplicates && addressReviewGroup) {
        const mergedIds = new Set([addressReviewData.targetCustomerId, ...addressReviewData.sourceCustomerIds]);
        const updatedGroups = duplicates.duplicateGroups.map(g => {
          if (g.id === addressReviewGroup.id) {
            // Keep unselected customers in the group
            const remainingCustomers = g.customers.filter(c => !mergedIds.has(c.id));
            if (remainingCustomers.length > 1) {
              // Group still has duplicates
              return {
                ...g,
                customers: remainingCustomers,
              };
            }
            // Group no longer has duplicates, will be filtered out
            return null;
          }
          return g;
        }).filter((g): g is DuplicateGroup => g !== null);

        const highConfidence = updatedGroups.filter((g) => g.confidence >= 90).length;
        const mediumConfidence = updatedGroups.filter(
          (g) => g.confidence >= 70 && g.confidence < 90
        ).length;
        const lowConfidence = updatedGroups.filter((g) => g.confidence < 70).length;

        setDuplicates({
          ...duplicates,
          duplicateGroups: updatedGroups,
          totalDuplicates: updatedGroups.length,
          highConfidence,
          mediumConfidence,
          lowConfidence,
        });
      }
    } catch (error) {
      console.error('Failed to merge customers:', error);
      showNotification('error', 'Failed to merge customers. Please try again.');
    } finally {
      setMergingGroupId(null);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
          {confidence}% - High
        </span>
      );
    } else if (confidence >= 70) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          {confidence}% - Medium
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
          {confidence}% - Low
        </span>
      );
    }
  };

  const filteredGroups = (duplicates?.duplicateGroups || [])
    .filter(group => {
      // Filter by confidence level
      if (filterLevel === 'high' && group.confidence < 90) return false;
      if (filterLevel === 'medium' && (group.confidence < 70 || group.confidence >= 90)) return false;
      if (filterLevel === 'low' && group.confidence >= 70) return false;

      // Exclude dismissed groups
      const customerIds = group.customers.map(c => c.id).sort().join('-');
      if (dismissedGroups.has(customerIds)) return false;

      return true;
    });

  return (
    <div className="p-4">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 z-[200] relative ${
            notification.type === 'success'
              ? 'border-green-500 bg-green-50 text-green-800 dark:border-green-500/50 dark:bg-green-900/20 dark:text-green-400'
              : notification.type === 'error'
              ? 'border-red-500 bg-red-50 text-red-800 dark:border-red-500/50 dark:bg-red-900/20 dark:text-red-400'
              : 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500/50 dark:bg-blue-900/20 dark:text-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notification.type === 'success' && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-current opacity-70 hover:opacity-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Duplicate Customers
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Find and merge duplicate customer records
            </p>
            {dismissedGroups.size > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {dismissedGroups.size} group(s) dismissed
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadDuplicates}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
            {dismissedGroups.size > 0 && (
              <button
                onClick={clearDismissed}
                className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Show Dismissed ({dismissedGroups.size})
              </button>
            )}
            <Link
              to="/customers"
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ← Back to Customers
            </Link>
          </div>
        </div>

        {/* Stats and Filters */}
        {duplicates && (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Stats */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Groups</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {duplicates.totalDuplicates}
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/20 dark:bg-green-900/10">
                <p className="text-sm text-green-700 dark:text-green-400">High Confidence</p>
                <p className="mt-1 text-2xl font-semibold text-green-900 dark:text-green-300">
                  {duplicates.highConfidence}
                </p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/20 dark:bg-yellow-900/10">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">Medium Confidence</p>
                <p className="mt-1 text-2xl font-semibold text-yellow-900 dark:text-yellow-300">
                  {duplicates.mediumConfidence}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/10">
                <p className="text-sm text-gray-600 dark:text-gray-400">Low Confidence</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-300">
                  {duplicates.lowConfidence}
                </p>
              </div>

              {/* Threshold Selector */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Threshold: {threshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setFilterLevel('all')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filterLevel === 'all'
                    ? 'bg-[#597485] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                All ({duplicates.totalDuplicates})
              </button>
              <button
                onClick={() => setFilterLevel('high')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filterLevel === 'high'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                High ({duplicates.highConfidence})
              </button>
              <button
                onClick={() => setFilterLevel('medium')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filterLevel === 'medium'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Medium ({duplicates.mediumConfidence})
              </button>
              <button
                onClick={() => setFilterLevel('low')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filterLevel === 'low'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Low ({duplicates.lowConfidence})
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="border-t border-gray-100 p-6 dark:border-gray-800">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#597485]"></div>
                <span className="text-gray-500">Analyzing customers...</span>
              </div>
            </div>
          )}

          {!loading && filteredGroups.length === 0 && (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No duplicates found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filterLevel !== 'all'
                  ? 'Try adjusting the filter or threshold.'
                  : 'Your customer database looks clean!'}
              </p>
            </div>
          )}

          {!loading && filteredGroups.map((group) => (
            <div
              key={group.id}
              className="mb-6 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/20"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {getConfidenceBadge(group.confidence)}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {group.reason}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-600 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete All
                  </button>
                  <button
                    onClick={() => handleDismissGroup(group)}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Keep Separate
                  </button>
                  <button
                    onClick={() => handleMergeGroup(group)}
                    disabled={mergingGroupId === group.id}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mergingGroupId === group.id ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                        Merging...
                      </>
                    ) : (
                      'Merge Selected'
                    )}
                  </button>
                </div>
              </div>

              {/* Customer Cards */}
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`rounded-lg border p-4 transition-all ${
                      selectedTargets[group.id] === customer.id
                        ? 'border-blue-500 bg-blue-50 shadow-md dark:border-blue-500 dark:bg-blue-900/20'
                        : selectedCustomers[group.id]?.has(customer.id)
                        ? 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800/50'
                        : 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/30'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCustomers[group.id]?.has(customer.id) ?? true}
                          onChange={() => {
                            const newSelections = { ...selectedCustomers };
                            if (!newSelections[group.id]) {
                              newSelections[group.id] = new Set(group.customers.map(c => c.id));
                            }
                            if (newSelections[group.id].has(customer.id)) {
                              newSelections[group.id].delete(customer.id);
                            } else {
                              newSelections[group.id].add(customer.id);
                            }
                            setSelectedCustomers(newSelections);
                          }}
                          className="h-4 w-4 text-blue-600 rounded"
                          title="Include in merge"
                        />
                        <input
                          type="radio"
                          name={`target-${group.id}`}
                          checked={selectedTargets[group.id] === customer.id}
                          disabled={!selectedCustomers[group.id]?.has(customer.id)}
                          onChange={() =>
                            setSelectedTargets({ ...selectedTargets, [group.id]: customer.id })
                          }
                          className="h-4 w-4 text-blue-600 disabled:opacity-40"
                        />
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Keep This
                        </label>
                      </div>
                      {customer.id === group.suggestedTarget && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Suggested
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {customer.firstName} {customer.lastName}
                    </h4>

                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{customer.email || 'No email'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span>{customer.phone || 'No phone'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                        <span>{customer.orderCount} order(s)</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          Created {new Date(customer.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="inline-flex text-xs font-medium text-[#597485] hover:underline"
                      >
                        View Details →
                      </Link>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id, group.id)}
                        className="inline-flex items-center rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Delete this customer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Address Review Modal */}
      {addressReviewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-gray-900">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Review Addresses Before Merging
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select which addresses to keep. Uncheck duplicates you want to remove.
              </p>
              <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <div className="flex gap-2">
                  <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Stripe IDs are always preserved:</strong> ALL Stripe customer IDs from all selected customers will be transferred to the target customer, regardless of which addresses you choose.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {loadingAddresses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-500">Loading addresses...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {addressReviewData.addresses.map((address) => {
                    const isFromTarget = address.customerId === addressReviewData.targetCustomerId;
                    const isSelected = selectedAddresses.has(address.id);

                    return (
                      <div
                        key={address.id}
                        className={`rounded-lg border p-4 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedAddresses);
                              if (e.target.checked) {
                                newSelected.add(address.id);
                              } else {
                                newSelected.delete(address.id);
                              }
                              setSelectedAddresses(newSelected);
                            }}
                            className="mt-1 h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {address.firstName} {address.lastName}
                              </h4>
                              {isFromTarget && (
                                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  Target Customer
                                </span>
                              )}
                              {address.label && (
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                  {address.label}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <div>{address.address1}</div>
                              {address.address2 && <div>{address.address2}</div>}
                              <div>
                                {address.city}, {address.province} {address.postalCode}
                              </div>
                              {address.company && (
                                <div className="text-xs">Company: {address.company}</div>
                              )}
                              {address.phone && (
                                <div className="text-xs">Phone: {address.phone}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {addressReviewData.addresses.length === 0 && !loadingAddresses && (
                <div className="py-12 text-center text-gray-500">
                  No addresses found for these customers.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAddresses.size} of {addressReviewData.addresses.length} address(es) selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAddressReviewGroup(null);
                      setAddressReviewData(null);
                      setSelectedAddresses(new Set());
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeMerge}
                    disabled={selectedAddresses.size === 0 || mergingGroupId !== null}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mergingGroupId ? 'Merging...' : `Merge & Keep ${selectedAddresses.size} Address(es)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
