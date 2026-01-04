import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { ChevronLeftIcon, PhotoIcon, LinkIcon, ArrowUpIcon, CheckCircleIcon, SaveIcon } from '@shared/assets/icons';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  cardMessage: string | null;
  specialInstructions: string | null;
  images?: string[];
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({ productCode: '', productName: '', description: '' });
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

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
    // First priority: Order-specific images (fetched/uploaded for this order)
    if (order.images && order.images.length > 0) {
      setProductImage(order.images[0]);
      return;
    }

    if (!order.orderItems || order.orderItems.length === 0) return;

    const firstItem = order.orderItems[0];

    // Second priority: Local product - use product images
    if (firstItem.productId && firstItem.product?.images && firstItem.product.images.length > 0) {
      setProductImage(firstItem.product.images[0]);
      return;
    }

    // Third priority: Wire-in product - check WireProductLibrary
    const searchText = firstItem.description || firstItem.customName || '';
    if (searchText) {
      try {
        const token = localStorage.getItem('token');

        // Extract product code from description or customName
        const codeMatch = searchText.match(/\b([A-Z]{2,3}\d{1,2}-\d+[A-Z]?|[A-Z]\d{1,2}-\d+[a-z]?)\b/);

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

      alert('Status updated successfully!');

      // Reload order to get updated status
      await loadOrder(order.id);

    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const extractPetalsUrl = (description: string): string | null => {
    if (!description) return null;

    // Look for petals.ca/XXXXX pattern (without http/https)
    const match = description.match(/petals\.ca\/[\w-]+/i);
    return match ? match[0] : null;
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

        // Extract product code if not already set
        let currentProductCode = wireProductCode;
        console.log('Current wireProductCode:', currentProductCode);
        if (!currentProductCode && order?.orderItems[0]) {
          const searchText = order.orderItems[0].description || order.orderItems[0].customName || '';
          console.log('Extracting code from:', searchText);
          const codeMatch = searchText.match(/\b([A-Z]{2,3}\d{1,2}-\d+[A-Z]?|[A-Z]\d{1,2}-\d+[a-z]?)\b/);
          if (codeMatch) {
            currentProductCode = codeMatch[1];
            console.log('Extracted product code:', currentProductCode);
            setWireProductCode(currentProductCode);
          }
        }

        // Save image to order
        if (order) {
          await saveImageToOrder(data.imageUrl);
        }

        alert('Image saved!');
      }

    } catch (error: any) {
      console.error('Error fetching image:', error);
      alert(`Failed to fetch image: ${error.message}`);
    } finally {
      setFetchingImage(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setFetchingImage(true);
      const token = localStorage.getItem('token');

      // Upload to Cloudflare R2 via backend
      const formData = new FormData();
      formData.append('image', file);
      if (wireProductCode) {
        formData.append('productCode', wireProductCode);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wire-products/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();

      if (data.imageUrl) {
        setProductImage(data.imageUrl);

        // Save image to order
        if (order) {
          await saveImageToOrder(data.imageUrl);
        }

        alert('Image uploaded successfully!');
      }

    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setFetchingImage(false);
    }
  };

  const handleGoogleImageSearch = async () => {
    if (!imageSearchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    try {
      setSearchingImages(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/wire-products/search-google-images?q=${encodeURIComponent(imageSearchQuery)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to search images');

      const data = await response.json();
      setImageSearchResults(data.items || []);
    } catch (error: any) {
      console.error('Error searching images:', error);
      alert(`Failed to search images: ${error.message}`);
    } finally {
      setSearchingImages(false);
    }
  };

  const saveImageToOrder = async (imageUrl: string) => {
    if (!order) return;

    try {
      const token = localStorage.getItem('token');

      // Add image to order's images array (avoid duplicates)
      const currentImages = order.images || [];
      const updatedImages = currentImages.includes(imageUrl)
        ? currentImages
        : [...currentImages, imageUrl];

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ images: updatedImages })
      });

      if (!response.ok) throw new Error('Failed to save image to order');

      // Update local order state
      setOrder({ ...order, images: updatedImages });

      console.log('Image saved to order');
    } catch (error) {
      console.error('Error saving image to order:', error);
    }
  };

  const saveImageToLibrary = async (imageUrl: string, productCode?: string) => {
    const codeToUse = productCode || wireProductCode;
    if (!codeToUse) return;

    try {
      const token = localStorage.getItem('token');

      await fetch(`${import.meta.env.VITE_API_URL}/api/wire-products/${codeToUse}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl })
      });

      console.log('Saved image to wire product library');
    } catch (error) {
      console.error('Error saving to library:', error);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!saveForm.productCode || !productImage) {
      alert('Product code and image are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Update or create wire product with full details
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wire-products/${saveForm.productCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl: productImage,
          productName: saveForm.productName || null,
          description: saveForm.description || null
        })
      });

      if (!response.ok) throw new Error('Failed to save to library');

      alert('Saved to wire product library!');
      setShowSaveModal(false);
      setSaveForm({ productCode: '', productName: '', description: '' });

      // Update wireProductCode if it was manually entered
      if (!wireProductCode) {
        setWireProductCode(saveForm.productCode);
      }
    } catch (error: any) {
      console.error('Error saving to library:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl text-gray-500 mb-4">Order not found</div>
        <button
          onClick={() => navigate('/delivery')}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
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
      {/* Back to Orders Link */}
      <div className="max-w-6xl mx-auto mb-3">
        <button
          onClick={() => navigate('/delivery')}
          className="text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Orders
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Compact Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Order #{order.orderNumber}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {order.recipientCustomer
                  ? `${order.recipientCustomer.firstName} ${order.recipientCustomer.lastName}`
                  : order.recipientName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Customer'}
              </p>
            </div>
            {order.deliveryDate && (
              <div className="text-right text-sm">
                <div className="text-gray-900 dark:text-white font-medium">{formatDate(new Date(order.deliveryDate))}</div>
                {order.deliveryTime && <div className="text-gray-500">{order.deliveryTime}</div>}
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-6 text-xs text-gray-600 dark:text-gray-400">
            {order.deliveryAddress && (
              <div>
                {order.deliveryAddress.address1}, {order.deliveryAddress.city}
              </div>
            )}
            {order.cardMessage && (
              <div className="italic flex-1 truncate" title={order.cardMessage}>
                "{order.cardMessage}"
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
            <div>
              <div className="flex justify-center">
                <img
                  src={productImage}
                  alt="Product"
                  className="max-w-[768px] w-full rounded-lg shadow-lg object-contain"
                />
              </div>

              {/* Save to Library Button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    setSaveForm({
                      productCode: wireProductCode || '',
                      productName: '',
                      description: ''
                    });
                    setShowSaveModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <SaveIcon className="w-4 h-4" />
                  Save to Library
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-12 text-center">
              <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
                <PhotoIcon className="w-12 h-12" />
                <span>No product image available</span>
              </div>

              {wireProductCode && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Product Code: {wireProductCode}
                </div>
              )}

              <div className="flex flex-col gap-3 items-center">
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById('imageUpload')?.click()}
                  disabled={fetchingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
                >
                  {fetchingImage ? (
                    'Uploading...'
                  ) : (
                    <>
                      <ArrowUpIcon className="w-4 h-4" />
                      Upload Image
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    // Try to extract petals.ca URL from description or customName
                    const item = order.orderItems[0];
                    const searchText = item?.description || item?.customName || '';
                    console.log('Searching for URL in:', searchText);
                    const defaultUrl = extractPetalsUrl(searchText);
                    console.log('Extracted URL:', defaultUrl);

                    const url = prompt(
                      'Enter image URL (e.g., petals.ca/ch77aa-s):',
                      defaultUrl || ''
                    );
                    if (url) handleFetchImage(url);
                  }}
                  disabled={fetchingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  {fetchingImage ? (
                    'Fetching...'
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Fetch from URL
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const item = order.orderItems[0];
                    const searchText = item?.description || item?.customName || '';
                    // Extract product code or use the text as search query
                    const codeMatch = searchText.match(/\b([A-Z]{2,3}\d{1,2}-\d+[A-Z]?|[A-Z]\d{1,2}-\d+[a-z]?)\b/);
                    setImageSearchQuery(codeMatch ? codeMatch[1] : searchText);
                    setShowImageSearchModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <PhotoIcon className="w-4 h-4" />
                  Search Google Images
                </button>
              </div>
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
              className="px-8 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 text-lg font-medium"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Current Status: <span className="font-medium">{order.status.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      {/* Save to Library Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Save to Wire Product Library
              </h2>

              <div className="mb-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={saveForm.productCode}
                      onChange={(e) => setSaveForm({...saveForm, productCode: e.target.value.toUpperCase()})}
                      placeholder="e.g., CH88AA-U"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product Name (optional)
                    </label>
                    <input
                      type="text"
                      value={saveForm.productName}
                      onChange={(e) => setSaveForm({...saveForm, productName: e.target.value})}
                      placeholder="e.g., Sunny Day Bouquet"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={saveForm.description}
                      onChange={(e) => setSaveForm({...saveForm, description: e.target.value})}
                      placeholder="Product details..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveToLibrary}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveForm({ productCode: '', productName: '', description: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Image Search Modal */}
      {showImageSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Search Google Images
              </h2>

              {/* Search Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGoogleImageSearch()}
                  placeholder="Enter search query..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleGoogleImageSearch}
                  disabled={searchingImages}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {searchingImages ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Image Results Grid */}
              {imageSearchResults.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {imageSearchResults.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedImageUrl(item.link)}
                        className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                          selectedImageUrl === item.link
                            ? 'border-blue-600 shadow-lg'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <img
                          src={item.image?.thumbnailLink || item.link}
                          alt={item.title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2 bg-gray-50 dark:bg-gray-700">
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {item.title}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected URL Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Image URL
                </label>
                <input
                  type="text"
                  value={selectedImageUrl}
                  onChange={(e) => setSelectedImageUrl(e.target.value)}
                  placeholder="Click an image above or paste URL here..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (selectedImageUrl) {
                      setShowImageSearchModal(false);
                      handleFetchImage(selectedImageUrl);
                    } else {
                      alert('Please select an image or enter a URL');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Fetch Image
                </button>
                <button
                  onClick={() => {
                    setShowImageSearchModal(false);
                    setImageSearchResults([]);
                    setSelectedImageUrl('');
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FulfillmentPage;
