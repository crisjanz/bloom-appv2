import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import { useApiClient } from "@shared/hooks/useApiClient";
import { useCommunicationsSocket } from "@shared/hooks/useCommunicationsSocket";
import useOrderNumberPrefix from "@shared/hooks/useOrderNumberPrefix";
import { formatOrderNumber } from "@shared/utils/formatOrderNumber";

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SmsNotification = {
  id: string;
  message: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: number;
    recipientCustomer?: { firstName: string; lastName: string } | null;
    customer?: { firstName: string; lastName: string } | null;
  };
};

type WebOrderNotification = {
  id: string;
  orderNumber: number;
  createdAt: string;
  grandTotal: number;
  customer?: { firstName: string; lastName: string } | null;
};

const SEEN_WEB_ORDERS_KEY = "bloom_seen_web_orders";

function getSeenWebOrders(): Set<string> {
  try {
    const stored = localStorage.getItem(SEEN_WEB_ORDERS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markWebOrderSeen(orderId: string) {
  const seen = getSeenWebOrders();
  seen.add(orderId);
  // Keep only last 100 to prevent unbounded growth
  const arr = Array.from(seen).slice(-100);
  localStorage.setItem(SEEN_WEB_ORDERS_KEY, JSON.stringify(arr));
}

function markAllWebOrdersSeen(orderIds: string[]) {
  const seen = getSeenWebOrders();
  orderIds.forEach((id) => seen.add(id));
  const arr = Array.from(seen).slice(-100);
  localStorage.setItem(SEEN_WEB_ORDERS_KEY, JSON.stringify(arr));
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const [isOpen, setIsOpen] = useState(false);

  const [smsNotifications, setSmsNotifications] = useState<SmsNotification[]>([]);
  const [webOrders, setWebOrders] = useState<WebOrderNotification[]>([]);
  const [unseenWebOrders, setUnseenWebOrders] = useState<WebOrderNotification[]>([]);
  const [smsCount, setSmsCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const [smsRes, webRes] = await Promise.all([
        apiClient.get("/api/communications/unread"),
        apiClient.get("/api/orders/recent-web"),
      ]);

      if (smsRes.data?.messages) {
        setSmsNotifications(smsRes.data.messages);
        setSmsCount(smsRes.data.messages.length);
      }

      if (webRes.data?.orders) {
        setWebOrders(webRes.data.orders);
        const seen = getSeenWebOrders();
        const unseen = webRes.data.orders.filter(
          (o: WebOrderNotification) => !seen.has(o.id)
        );
        setUnseenWebOrders(unseen);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [apiClient]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Listen for real-time SMS
  useCommunicationsSocket((event) => {
    if (event.type === "sms:received") {
      fetchNotifications();
    }
  });

  const totalCount = smsCount + unseenWebOrders.length;

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleSmsClick = (notification: SmsNotification) => {
    closeDropdown();
    navigate(`/orders/${notification.order.id}?openComms=true`);
  };

  const handleWebOrderClick = (order: WebOrderNotification) => {
    markWebOrderSeen(order.id);
    setUnseenWebOrders((prev) => prev.filter((o) => o.id !== order.id));
    closeDropdown();
    navigate(`/orders/${order.id}`);
  };

  const handleDismissWebOrder = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    markWebOrderSeen(orderId);
    setUnseenWebOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleClearAll = () => {
    markAllWebOrdersSeen(unseenWebOrders.map((o) => o.id));
    setUnseenWebOrders([]);
  };

  const getCustomerName = (notification: SmsNotification) => {
    const recipient = notification.order.recipientCustomer;
    const customer = notification.order.customer;
    if (recipient) return `${recipient.firstName} ${recipient.lastName}`;
    if (customer) return `${customer.firstName} ${customer.lastName}`;
    return "Unknown";
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatTimeAgo(dateStr);
    } catch {
      return "";
    }
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-auto max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Notifications
            </h5>
            {totalCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Clear all
              </button>
            )}
          </div>
          <button
            onClick={closeDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No new notifications
            </div>
          ) : (
            <>
              {/* SMS Responses */}
              {smsNotifications.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    SMS Responses
                  </div>
                  {smsNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleSmsClick(notification)}
                      className="flex w-full gap-3 rounded-lg p-3 text-left hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <svg
                          className="h-5 w-5 text-blue-600 dark:text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800 dark:text-white">
                            Order #{formatOrderNumber(notification.order.orderNumber, orderNumberPrefix)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {getCustomerName(notification)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          "{notification.message}"
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Web Orders */}
              {unseenWebOrders.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mt-2">
                    New Web Orders
                  </div>
                  {unseenWebOrders.map((order) => (
                    <div
                      key={order.id}
                      className="group relative flex w-full gap-3 rounded-lg p-3 text-left hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                      onClick={() => handleWebOrderClick(order)}
                    >
                      <button
                        onClick={(e) => handleDismissWebOrder(e, order.id)}
                        className="absolute right-2 top-2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <svg
                          className="h-5 w-5 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800 dark:text-white">
                            Order #{formatOrderNumber(order.orderNumber, orderNumberPrefix)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(order.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`
                            : "Guest"}
                        </div>
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          ${(order.grandTotal / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </Dropdown>
    </div>
  );
}
