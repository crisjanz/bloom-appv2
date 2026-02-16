import { useCustomerOrderHistory } from "@/domains/orders/hooks/useCustomerOrders";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@shared/ui/components/ui/table";
import { Link } from "react-router-dom";
import { formatCurrency } from "@shared/utils/currency";
import useOrderNumberPrefix from "@shared/hooks/useOrderNumberPrefix";
import { formatOrderNumber } from "@shared/utils/formatOrderNumber";

interface OrderHistoryCardProps {
  customerId: string;
  expanded: boolean;
  onToggle: (next: boolean) => void;
}

export default function OrderHistoryCard({ customerId, expanded, onToggle }: OrderHistoryCardProps) {
  const { orders, loading, customerMetrics } = useCustomerOrderHistory(customerId);
  const orderNumberPrefix = useOrderNumberPrefix();

  // Format date
  const formatDate = (date: Date | string) => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
      case 'DELIVERED':
      case 'PICKED_UP':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'READY':
      case 'READY_FOR_DELIVERY':
      case 'READY_FOR_PICKUP':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'OUT_FOR_DELIVERY':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'IN_DESIGN':
      case 'IN_PRODUCTION':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Check if customer is recipient of an order
  const isRecipient = (order: any) => {
    return order.recipientCustomerId === customerId;
  };

  if (loading) {
    return (
      <ComponentCardCollapsible title="Order History" isOpen={expanded} onToggle={onToggle}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible title="Order History" isOpen={expanded} onToggle={onToggle}>
      {/* Customer Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {customerMetrics.totalOrders}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Spent</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(customerMetrics.totalSpent.amount)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Order Value</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(customerMetrics.averageOrderValue.amount)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Order</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {customerMetrics.lastOrderDate ? formatDate(customerMetrics.lastOrderDate) : '—'}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Order #
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Date
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Role
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Type
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
                  >
                    Total
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="font-medium text-gray-900 text-theme-sm dark:text-white">
                        #{order.orderNumber
                          ? formatOrderNumber(order.orderNumber, orderNumberPrefix)
                          : order.id.slice(-8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(order.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      {isRecipient(order) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                          Recipient
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                          </svg>
                          Buyer
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {order.type === 'DELIVERY' ? 'Delivery' : order.type === 'PICKUP' ? 'Pickup' : order.type}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-end">
                      <span className="font-semibold text-gray-900 text-theme-sm dark:text-white">
                        {formatCurrency(order.paymentAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No orders found for this customer
          </p>
        </div>
      )}
    </ComponentCardCollapsible>
  );
}
