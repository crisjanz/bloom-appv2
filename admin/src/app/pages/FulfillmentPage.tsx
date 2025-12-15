import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  cardMessage: string | null;
  specialInstructions: string | null;
  customer: {
    firstName: string;
    lastName: string;
  };
  recipientCustomer?: {
    firstName: string;
    lastName: string;
  };
  deliveryAddress?: {
    address1: string;
    city: string;
    province: string;
  };
  orderItems: Array<{
    id: string;
    customName: string;
    description: string | null;
    productId: string | null;
    product?: {
      images: string[];
    };
  }>;
}

const FulfillmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDate } = useBusinessTimezone();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [wireProductCode, setWireProductCode] = useState<string | null>(null);
  const [fetchingImage, setFetchingImage] = useState(false);

  // Load order on mount
  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load order');

      const data = await response.json();
      setOrder(data.order);
      setSelectedStatus(data.order.status);

      // Determine product image source
      await determineProductImage(data.order);

    } catch (error) {
      console.error('Error loading order:', error);
      alert('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const determineProductImage = async (order: Order) => {
    if (!order.orderItems || order.orderItems.length === 0) return;

    const firstItem = order.orderItems[0];

    // Local product - use product images
    if (firstItem.productId && firstItem.product?.images && firstItem.product.images.length > 0) {
      setProductImage(firstItem.product.images[0]);
      return;
    }

    // Wire-in product - check WireProductLibrary
    if (firstItem.description) {
      try {
        const token = localStorage.getItem('token');

        // Extract product code from description
        const codeMatch = firstItem.description.match(/\b([A-Z]{2,3}\d{1,2}-\d+[A-Z]?|[A-Z]\d{1,2}-\d+[a-z]?)\b/);

        if (codeMatch) {
          const productCode = codeMatch[1];
          setWireProductCode(productCode);

          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wire-products/${productCode}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.product?.imageUrl) {
              setProductImage(data.product.imageUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching wire product image:', error);
      }
    }
  };

  const handleStatusUpdate = async () => {
    if (!order || !selectedStatus) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      alert('✅ Status updated successfully!');

      // Reload order to get updated status
      await loadOrder(order.id);

    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleFetchImage = async (url: string) => {
    try {
      setFetchingImage(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wire-products/fetch-image?url=${encodeURIComponent(url)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch image');
      }

      const data = await response.json();

      if (data.imageUrl) {
        setProductImage(data.imageUrl);
        alert('✅ Image found! Save it to the wire product library if correct.');
      }

    } catch (error: any) {
      console.error('Error fetching image:', error);
      alert(`Failed to fetch image: ${error.message}`);
    } finally {
      setFetchingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#597485]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl text-gray-500 mb-4">Order not found</div>
        <button
          onClick={() => navigate('/delivery')}
          className="px-4 py-2 bg-[#597485] text-white rounded hover:bg-[#4e6575]"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const statuses = [
    'DRAFT',
    'PAID',
    'IN_DESIGN',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with minimal info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {order.recipientCustomer
                  ? `${order.recipientCustomer.firstName} ${order.recipientCustomer.lastName}`
                  : `${order.customer.firstName} ${order.customer.lastName}`}
              </p>
            </div>
            <button
              onClick={() => navigate('/delivery')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {order.deliveryAddress && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Address:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {order.deliveryAddress.address1}<br />
                  {order.deliveryAddress.city}, {order.deliveryAddress.province}
                </div>
              </div>
            )}
            {order.deliveryDate && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Delivery:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {formatDate(new Date(order.deliveryDate))}
                  {order.deliveryTime && ` - ${order.deliveryTime}`}
                </div>
              </div>
            )}
            {order.cardMessage && (
              <div className="col-span-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Card Message:</span>
                <div className="text-gray-600 dark:text-gray-400 italic">"{order.cardMessage}"</div>
              </div>
            )}
          </div>
        </div>

        {/* Large Product Image */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Product Image
          </h2>

          {productImage ? (
            <div className="flex justify-center">
              <img
                src={productImage}
                alt="Product"
                className="max-w-full max-h-96 rounded-lg shadow-lg object-contain"
              />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-12 text-center">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                📷 No product image available
              </div>

              {wireProductCode && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Product Code: {wireProductCode}
                  </div>
                  <button
                    onClick={() => {
                      const url = prompt('Enter image URL (e.g., petals.ca/ch77aa-s):');
                      if (url) handleFetchImage(url);
                    }}
                    disabled={fetchingImage}
                    className="px-4 py-2 bg-[#597485] text-white rounded hover:bg-[#4e6575] disabled:opacity-50"
                  >
                    {fetchingImage ? 'Fetching...' : '🔗 Fetch from URL'}
                  </button>
                </div>
              )}
            </div>
          )}

          {order.orderItems[0] && (
            <div className="mt-4 text-center">
              <div className="font-medium text-gray-900 dark:text-white">
                {order.orderItems[0].customName}
              </div>
              {order.orderItems[0].description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {order.orderItems[0].description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Update */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Update Status
          </h2>

          <div className="flex gap-4 items-center">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <button
              onClick={handleStatusUpdate}
              disabled={updating || selectedStatus === order.status}
              className="px-8 py-3 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] disabled:opacity-50 text-lg font-medium"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Current Status: <span className="font-medium">{order.status.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentPage;
