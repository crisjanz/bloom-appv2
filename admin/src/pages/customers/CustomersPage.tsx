import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import InputField from "../../components/form/input/InputField";
import { Link } from "react-router-dom";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data);
        setFilteredCustomers(data);
      })
      .catch(() => alert("Failed to load customers"));
  }, []);

  useEffect(() => {
    const filtered = customers.filter((customer) =>
      `${customer.firstName} ${customer.lastName} ${customer.email || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

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
                  {filteredCustomers.map((c) => (
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

          {/* Empty State */}
          {filteredCustomers.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No customers found matching "{searchTerm}"
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}