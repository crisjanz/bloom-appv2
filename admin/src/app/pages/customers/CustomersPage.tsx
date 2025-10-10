import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@shared/ui/components/ui/table";
import InputField from "@shared/ui/forms/input/InputField";
import { Link } from "react-router-dom";

// MIGRATION: Use domain hook for better customer management
import { useCustomerSearch } from "@domains/customers/hooks/useCustomerService.ts";

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
  // MIGRATION: Use domain hook for better customer search
  const { 
    query: searchTerm, 
    setQuery: setSearchTerm, 
    results: searchResults, 
    isSearching 
  } = useCustomerSearch();
  
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all customers on mount
  useEffect(() => {
    const loadAllCustomers = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/customers");
        const data = await response.json();
        setAllCustomers(data);
      } catch (error) {
        console.error("Failed to load customers:", error);
        // Better error handling than alert
      } finally {
        setLoading(false);
      }
    };
    
    loadAllCustomers();
  }, []);

  // MIGRATION: Use search results if searching, otherwise show all customers
  const displayedCustomers = searchTerm.length >= 3 ? searchResults : allCustomers;

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Custom Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Customers
            </h3>
          </div>
          <Link
            to="/customers/new"
            className="inline-flex items-center px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </Link>
        </div>

        {/* Card Body - Starts Here */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          
          {/* Search Box */}
          <div className="mb-6">
            <InputField
              label="Search Customers"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>

          {/* TailAdmin Table Container */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                {/* Table Header */}
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Customer Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Email
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                {/* Table Body */}
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {/* MIGRATION: Show loading state */}
                  {(loading || isSearching) && (
                    <TableRow>
                      <TableCell colSpan={3} className="px-5 py-8 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#597485]"></div>
                          <span className="text-gray-500">Loading customers...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* MIGRATION: Show customers with improved search functionality */}
                  {!loading && !isSearching && displayedCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {c.firstName} {c.lastName}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                          {c.email || "No email"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <Link
                          to={`/customers/${c.id}`}
                          className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
                        >
                          Edit
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* MIGRATION: Improved empty states */}
          {!loading && !isSearching && displayedCustomers.length === 0 && (
            <div className="text-center py-8">
              {searchTerm.length >= 3 ? (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    No customers found matching "{searchTerm}"
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Try a different search term or add a new customer
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    No customers yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Add your first customer to get started
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}