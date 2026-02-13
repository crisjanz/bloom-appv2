import { useState, useCallback } from "react";
import { Modal } from "../components/ui/modal";
import { useApiClient } from "@shared/hooks/useApiClient";
import { formatPhoneDisplay } from "@shared/ui/forms/PhoneInput";

type OrderItem = {
  name: string;
  price: string | null;
  qty: string;
};

type LegacyOrder = {
  orderNumber: string;
  orderDate: string | null;
  deliveryDate: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  recipientCity: string | null;
  orderTotal: number | null;
  orderType: string | null;
  cardMessage: string | null;
  items: OrderItem[];
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function LegacyOrderSearch() {
  const apiClient = useApiClient();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LegacyOrder[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LegacyOrder | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setSearching(true);
    setSearched(true);
    try {
      const { data } = await apiClient.get(`/api/legacy-orders/search?q=${encodeURIComponent(query.trim())}`);
      setResults(data?.orders || []);
    } catch (err) {
      console.error("Legacy order search failed:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [apiClient, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSearched(false);
    setSelectedOrder(null);
  };

  return (
    <>
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => setIsOpen(true)}
        title="Search Legacy Orders"
      >
        {/* Clock/History Icon */}
        <svg
          className="stroke-current"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-3xl">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Search Legacy Orders (Floranext)
          </h2>

          {/* Search Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name, phone, email, or address..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!searched ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                Enter a name, phone, email, or address to search old orders
              </div>
            ) : searching ? (
              <div className="py-12 text-center">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-b-2 border-brand-500"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                No orders found for "{query}"
              </div>
            ) : selectedOrder ? (
              /* Order Detail View */
              <div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="mb-4 text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to results
                </button>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Order #{selectedOrder.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedOrder.orderType} • {formatDate(selectedOrder.orderDate)}
                      </p>
                    </div>
                    {selectedOrder.orderTotal && (
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${(selectedOrder.orderTotal / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</h4>
                      <p className="text-gray-900 dark:text-white">{selectedOrder.customerName || "-"}</p>
                      {selectedOrder.customerPhone && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {formatPhoneDisplay(selectedOrder.customerPhone)}
                        </p>
                      )}
                      {selectedOrder.customerEmail && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{selectedOrder.customerEmail}</p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Recipient</h4>
                      <p className="text-gray-900 dark:text-white">{selectedOrder.recipientName || "-"}</p>
                      {selectedOrder.recipientPhone && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {formatPhoneDisplay(selectedOrder.recipientPhone)}
                        </p>
                      )}
                      {selectedOrder.recipientAddress && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {selectedOrder.recipientAddress}
                          {selectedOrder.recipientCity && `, ${selectedOrder.recipientCity}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedOrder.deliveryDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Delivery Date</h4>
                      <p className="text-gray-900 dark:text-white">{formatDate(selectedOrder.deliveryDate)}</p>
                    </div>
                  )}

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Items</h4>
                      <div className="space-y-1">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-900 dark:text-white">
                              {item.qty}x {item.name}
                            </span>
                            {item.price && (
                              <span className="text-gray-600 dark:text-gray-300">${item.price}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedOrder.cardMessage && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Card Message</h4>
                      <p className="text-gray-900 dark:text-white italic">"{selectedOrder.cardMessage}"</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Results List */
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Found {results.length} order{results.length !== 1 ? "s" : ""}
                </p>
                {results.map((order) => (
                  <button
                    key={order.orderNumber}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {formatDate(order.orderDate)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {order.orderType}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      <span>{order.customerName || "Unknown"}</span>
                      {order.recipientName && order.recipientName !== order.customerName && (
                        <span className="text-gray-400"> → {order.recipientName}</span>
                      )}
                    </div>
                    {order.recipientCity && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {order.recipientCity}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
