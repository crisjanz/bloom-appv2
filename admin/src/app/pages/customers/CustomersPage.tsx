import { useCallback, useEffect, useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import { Link, useNavigate } from "react-router-dom";
import { useApiClient } from "@shared/hooks/useApiClient";
import StandardTable, { ColumnDef } from "@shared/ui/components/ui/table/StandardTable";
import Pagination from "@shared/ui/components/ui/pagination/Pagination";
import EmptyState from "@shared/ui/components/ui/empty-state/EmptyState";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";
import { formatPhoneDisplay } from "@shared/ui/forms/PhoneInput";

// MIGRATION: Use domain hook for better customer management
import { useCustomerSearch } from "@domains/customers/hooks/useCustomerService.ts";

// Inline SVG icons
const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

// MIGRATION: Use proper Customer type (will be replaced with domain entity)
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export default function CustomersPage() {
  const apiClient = useApiClient();

  // MIGRATION: Use domain hook for better customer search
  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    results: searchResults,
    isSearching
  } = useCustomerSearch();

  const navigate = useNavigate();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const fetchCustomers = useCallback(
    async (pageToLoad: number = 0) => {
      setLoading(true);
      try {
        const response = await apiClient.get(
          `/api/customers?paginated=true&page=${pageToLoad}&pageSize=${pageSize}`
        );
        const data = response.data;

        if (Array.isArray(data)) {
          setAllCustomers(data);
          setTotalCustomers(data.length);
          if (pageToLoad !== 0) {
            setPage(0);
          }
          return;
        }

        const items: Customer[] = Array.isArray(data.items) ? data.items : [];
        const total = typeof data.total === "number" ? data.total : items.length;
        const serverPage = typeof data.page === "number" ? data.page : pageToLoad;
        const serverPageSize = typeof data.pageSize === "number" ? data.pageSize : pageSize;

        if (total > 0 && items.length === 0 && serverPage > 0) {
          const lastPage = Math.max(Math.ceil(total / serverPageSize) - 1, 0);
          if (lastPage !== serverPage) {
            setPage(lastPage);
            return;
          }
        }

        setAllCustomers(items);
        setTotalCustomers(total);
        if (serverPage !== pageToLoad) {
          setPage(serverPage);
        }
        if (serverPageSize !== pageSize) {
          setPageSize(serverPageSize);
        }
      } catch (error) {
        console.error("Failed to load customers:", error);
      } finally {
        setLoading(false);
      }
    },
    [apiClient, pageSize]
  );

  useEffect(() => {
    fetchCustomers(page);
  }, [fetchCustomers, page]);

  const refreshCustomers = useCallback(
    async (targetPage: number = page) => {
      await fetchCustomers(targetPage);
    },
    [fetchCustomers, page]
  );

  // Delete customer
  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${customerName}?\n\n` +
      `Note: Any orders will be preserved but unlinked from this customer.\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(customerId);

    try {
      const response = await apiClient.delete(`/api/customers/${customerId}`);
      const data = response.data;

      await refreshCustomers(page);

      // Show informative message about what happened
      let message = `${customerName} has been successfully deleted.`;
      if (data.ordersUnlinked > 0) {
        message += `\n\n${data.ordersUnlinked} order(s) were unlinked (order data preserved).`;
      }
      if (data.addressesDeleted > 0) {
        message += `\n${data.addressesDeleted} address(es) were deleted.`;
      }

      alert(message);
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // MIGRATION: Use search results if searching, otherwise show paginated customers
  const isSearchingActive = searchTerm.length >= 3;
  const displayedCustomers = isSearchingActive ? searchResults : allCustomers;

  // Define table columns
  const columns: ColumnDef<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      className: 'w-[250px] max-w-[250px]',
      render: (customer) => {
        const name = `${customer.firstName} ${customer.lastName}`;
        return (
          <div className="max-w-[250px] truncate">
            <span className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap" title={name}>
              {name}
            </span>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      className: 'w-[250px]',
      render: (customer) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {customer.email || "—"}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'w-[180px]',
      render: (customer) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {customer.phone ? formatPhoneDisplay(customer.phone) : "—"}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[80px]',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${customer.id}`);
            }}
            className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Edit customer"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCustomer(customer.id, `${customer.firstName} ${customer.lastName}`);
            }}
            disabled={deletingId === customer.id}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete customer"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  // Empty state configuration
  const getEmptyState = () => {
    if (isSearchingActive) {
      return {
        message: `No customers found matching "${searchTerm}"`,
      };
    }
    return {
      message: "No customers yet. Add your first customer to get started.",
    };
  };

  return (
    <div className="p-6">
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage customer information
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/customers/duplicates"
            className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Find Duplicates
          </Link>
          <Link
            to="/customers/new"
            className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Customer
          </Link>
        </div>
      </div>

      {/* Card with Filters + Table */}
      <ComponentCard>
        {/* Search/Filters */}
        <div className="space-y-4 mb-6">
          <InputField
            label="Search Customers"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <StandardTable
          columns={columns}
          data={displayedCustomers}
          loading={loading || isSearching}
          emptyState={getEmptyState()}
          pagination={
            !isSearchingActive
              ? {
                  currentPage: page + 1,
                  totalItems: totalCustomers,
                  itemsPerPage: pageSize,
                  onPageChange: (newPage) => setPage(newPage - 1),
                }
              : undefined
          }
        />
      </ComponentCard>
    </div>
  );
}
