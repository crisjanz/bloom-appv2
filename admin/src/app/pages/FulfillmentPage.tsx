import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { ChevronLeftIcon, PhotoIcon, LinkIcon, SaveIcon } from '@shared/assets/icons';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';
import useOrderImages, { OrderImage, OrderImageCategory } from '@shared/hooks/useOrderImages';
import FulfillmentImageUploadModal from '@app/components/fulfillment/FulfillmentImageUploadModal';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string | number;
  status: string;
  paymentStatus?: string;
  deliveryDate: string | null;
  deliveryTime: string | null;
  cardMessage: string | null;
  specialInstructions: string | null;
  orderImages?: OrderImage[];
  customer: {
    firstName: string;
    lastName: string;
  };
  recipientCustomer?: {
    firstName: string;
    lastName: string;
  };
  recipientName?: string | null;
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

const mergeOrderImages = (existing: OrderImage[] = [], incoming: OrderImage[] = []): OrderImage[] => {
  const imageMap = new Map(existing.map((image) => [image.id, image]));

  incoming.forEach((image) => {
    imageMap.set(image.id, image);
  });

  return Array.from(imageMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const RESULT_IMAGE_CATEGORY_VALUES: OrderImageCategory[] = ['FULFILLED', 'DELIVERED', 'OTHER'];

const RESULT_IMAGE_CATEGORY_OPTIONS: Array<{ value: OrderImageCategory; label: string }> = [
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'OTHER', label: 'Other' }
];

const REFERENCE_TAG_SUGGESTIONS = [
  'Model',
  'Recipe',
  'Inspiration',
  'Color palette'
];

const RESULT_TAG_SUGGESTIONS = [
  'Studio',
  'Final',
  'Delivery proof',
  'Issue'
];

type ImageModalMode = 'reference' | 'result';

const FulfillmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderNumberPrefix = useOrderNumberPrefix();
  const { formatDate } = useBusinessTimezone();
  const { addOrderImages, deleteOrderImage } = useOrderImages();

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
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);
  const [fulfillmentNotes, setFulfillmentNotes] = useState<string[]>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalMode, setImageModalMode] = useState<ImageModalMode>('result');
  const [imageModalInitialImage, setImageModalInitialImage] = useState<string | null>(null);

  // Load order on mount
  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load order');

      const data = await response.json();
      setOrder(data.order);
      setSelectedStatus(data.order.status);

      await loadFulfillmentNotes(data.order.id);
      // Determine product image source
      await determineProductImage(data.order);

    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const loadFulfillmentNotes = async (orderId: string) => {
    try {
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/communications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        setFulfillmentNotes([]);
        return [];
      }

      const data = await response.json();
      const notes: string[] = [];
      const communications = Array.isArray(data?.communications) ? data.communications : [];

      communications.forEach((comm: any) => {
        if (typeof comm?.message !== 'string') return;
        const message = comm.message.trim();
        const noteMatch = message.match(/^Fulfillment photo note \| url:.*? \| note:(.*)$/i);
        const noteOnlyMatch = message.match(/^Fulfillment note:\s*(.*)$/i);

        if (noteMatch) {
          const note = noteMatch[1]?.trim();
          if (note) notes.push(note);
          return;
        }

        if (noteOnlyMatch) {
          const note = noteOnlyMatch[1]?.trim();
          if (note) notes.push(note);
        }
      });

      setFulfillmentNotes(notes);
      return notes;
    } catch (error) {
      console.error('Error loading fulfillment notes:', error);
      setFulfillmentNotes([]);
      return [];
    }
  };

  const openReferenceImageModal = (initialImage: string | null = null) => {
    setImageModalMode('reference');
    setImageModalInitialImage(initialImage);
    setIsImageModalOpen(true);
  };

  const openResultImageModal = () => {
    setImageModalMode('result');
    setImageModalInitialImage(null);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setImageModalInitialImage(null);
  };

  const determineProductImage = async (order: Order) => {
    const referenceImage = (order.orderImages || []).find((image) => image.category === 'REFERENCE');

    // First priority: Explicit reference image chosen for fulfillment.
    if (referenceImage?.url) {
      setProductImage(referenceImage.url);
      return;
    }

    if (!order.orderItems || order.orderItems.length === 0) return;

    // Second priority: Local product with linked images
    const itemWithImage = order.orderItems.find(
      (item) => item.product?.images && item.product.images.length > 0
    );
    if (itemWithImage?.product?.images?.[0]) {
      setProductImage(itemWithImage.product.images[0]);
      return;
    }

    // Third priority: Try to match catalog product by name (for imported/website orders without productId)
    const nameCandidate = order.orderItems.find((item) => item.customName)?.customName || '';
    const baseName = nameCandidate.split(' - ')[0]?.trim();
    if (baseName) {
      try {
        const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/products/search?q=${encodeURIComponent(baseName)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const normalizedBase = baseName.toLowerCase();
            const match =
              data.find(
                (product: any) =>
                  typeof product.name === 'string' &&
                  product.name.toLowerCase() === normalizedBase &&
                  Array.isArray(product.images) &&
                  product.images.length > 0
              ) ||
              data.find(
                (product: any) =>
                  Array.isArray(product.images) && product.images.length > 0
              );

            if (match?.images?.[0]) {
              setProductImage(match.images[0]);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error matching catalog product image:', error);
      }
    }

    // Fourth priority: Wire-in product - check WireProductLibrary
    const firstItem = order.orderItems[0];
    const searchText = firstItem.description || firstItem.customName || '';
    if (searchText) {
      try {
        const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

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
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Status updated');

      // Reload order to get updated status
      await loadOrder(order.id);

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

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
        openReferenceImageModal(data.imageUrl);

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
      }

    } catch (error: any) {
      console.error('Error fetching image:', error);
      toast.error(`Failed to fetch image: ${error.message}`);
    } finally {
      setFetchingImage(false);
    }
  };

  const handleGoogleImageSearch = async () => {
    if (!imageSearchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      setSearchingImages(true);
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

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
      toast.error(`Failed to search images: ${error.message}`);
    } finally {
      setSearchingImages(false);
    }
  };

  const saveImagesToOrder = async (
    images: Array<{ url: string; category: OrderImageCategory; tag?: string; note?: string }>
  ) => {
    if (!order || images.length === 0) return;

    try {
      const savedImages = await addOrderImages(order.id, {
        images: images.map((image) => ({
          url: image.url,
          category: image.category,
          tag: image.tag || null,
          note: image.note || null
        }))
      });

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              orderImages: mergeOrderImages(prev.orderImages || [], savedImages)
            }
          : prev
      );
    } catch (error) {
      console.error('Error saving images to order:', error);
      throw error;
    }
  };

  const uploadOrderImageBlob = async (blob: Blob): Promise<string> => {
    if (!order) {
      throw new Error('Order not loaded');
    }

    const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');
    const formData = new FormData();
    const file = new File([blob], `order-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
    formData.append('images', file);

    const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/upload-images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to upload image');
    }

    const uploadData = await uploadResponse.json();
    const uploadedImageUrls = Array.isArray(uploadData?.imageUrls) ? uploadData.imageUrls : [];
    const uploadedImageUrl = uploadedImageUrls[0];

    if (!uploadedImageUrl) {
      throw new Error('No image URL returned from upload');
    }

    return uploadedImageUrl;
  };

  const saveImageNote = async (orderId: string, imageUrl: string, note: string) => {
    const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');
    const message = `Fulfillment photo note | url:${imageUrl} | note:${note}`;

    const noteResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'NOTE',
        message
      })
    });

    if (!noteResponse.ok) {
      const errorData = await noteResponse.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to save image note');
    }
  };

  const handleImageModalSave = async ({
    croppedBlob,
    category,
    tag,
    note
  }: {
    croppedBlob: Blob;
    category: OrderImageCategory;
    tag?: string;
    note?: string;
  }) => {
    if (!order) {
      throw new Error('Order not loaded');
    }

    let categoryToSave: OrderImageCategory = 'FULFILLED';
    if (imageModalMode === 'reference') {
      categoryToSave = 'REFERENCE';
    } else if (RESULT_IMAGE_CATEGORY_VALUES.includes(category)) {
      categoryToSave = category;
    }
    const imageUrl = await uploadOrderImageBlob(croppedBlob);

    await saveImagesToOrder([
      {
        url: imageUrl,
        category: categoryToSave,
        tag,
        note
      }
    ]);

    if (categoryToSave === 'REFERENCE') {
      setProductImage(imageUrl);
    }

    if (note) {
      await saveImageNote(order.id, imageUrl, note);
      setFulfillmentNotes((prev) => [note, ...prev]);
    }

    toast.success('Photo saved');
  };

  const removeImageFromOrder = async (imageId: string, imageUrl: string) => {
    if (!order) return;

    try {
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');
      await deleteOrderImage(order.id, imageId);

      // Delete from Cloudflare R2
      try {
        const url = new URL(imageUrl);
        const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        await fetch(`${import.meta.env.VITE_API_URL}/api/images/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ key })
        });
      } catch (r2Error) {
        console.error('Failed to delete from R2:', r2Error);
      }

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              orderImages: (prev.orderImages || []).filter((image) => image.id !== imageId)
            }
          : prev
      );
    } catch (error) {
      console.error('Error removing image from order:', error);
      setFulfillmentError('Failed to remove image.');
    }
  };

  const saveImageToLibrary = async (imageUrl: string, productCode?: string) => {
    const codeToUse = productCode || wireProductCode;
    if (!codeToUse) return;

    try {
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

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
      toast.error('Product code and image are required');
      return;
    }

    try {
      const token = localStorage.getItem('bloom_access_token') || localStorage.getItem('token');

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

      toast.success('Saved to wire product library');
      setShowSaveModal(false);
      setSaveForm({ productCode: '', productName: '', description: '' });

      // Update wireProductCode if it was manually entered
      if (!wireProductCode) {
        setWireProductCode(saveForm.productCode);
      }
    } catch (error: any) {
      console.error('Error saving to library:', error);
      toast.error(`Failed to save: ${error.message}`);
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

  const fulfilledOrderImages = (order.orderImages || []).filter((image) => image.category === 'FULFILLED');
  const deliveredOrderImages = (order.orderImages || []).filter((image) => image.category === 'DELIVERED');
  const otherOrderImages = (order.orderImages || []).filter((image) => image.category === 'OTHER');
  const referenceOrderImage = (order.orderImages || []).find((image) => image.category === 'REFERENCE');
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
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Order #{formatOrderNumber(order.orderNumber, orderNumberPrefix)}
                </h1>
              </div>
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
              {(referenceOrderImage?.tag || referenceOrderImage?.note) && (
                <div className="mt-3 max-w-[768px] mx-auto rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900">
                  {referenceOrderImage?.tag && (
                    <div className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {referenceOrderImage.tag}
                    </div>
                  )}
                  {referenceOrderImage?.note && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {referenceOrderImage.note}
                    </div>
                  )}
                </div>
              )}

              {/* Save to Library Button */}
              <div className="mt-4 flex justify-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
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
                  <button
                    onClick={() => openReferenceImageModal()}
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                  >
                    Update Reference Photo
                  </button>
                </div>
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
                <button
                  onClick={() => openReferenceImageModal()}
                  disabled={fetchingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 disabled:opacity-50"
                >
                  Add Reference Photo
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
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

        {/* Fulfilled Arrangement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Fulfilled Arrangement
          </h2>

          {fulfillmentError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {fulfillmentError}
            </div>
          )}

          <div className="space-y-4">
            {fulfilledOrderImages.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fulfilled photos
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fulfilledOrderImages.map((image, index) => (
                    <div
                      key={image.id}
                      onClick={() => window.open(image.url, '_blank')}
                      className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          window.open(image.url, '_blank');
                        }
                      }}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeImageFromOrder(image.id, image.url);
                          }}
                          className="absolute top-1 right-1 z-10 rounded-full bg-black/70 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                        <img
                          src={image.url}
                          alt={`Fulfillment photo ${index + 1}`}
                          className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      {(image.tag || image.note) && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
                          {image.tag && (
                            <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                              {image.tag}
                            </div>
                          )}
                          {image.note && (
                            <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate" title={image.note}>
                              {image.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {deliveredOrderImages.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivered photos
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {deliveredOrderImages.map((image, index) => (
                    <div
                      key={image.id}
                      onClick={() => window.open(image.url, '_blank')}
                      className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          window.open(image.url, '_blank');
                        }
                      }}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeImageFromOrder(image.id, image.url);
                          }}
                          className="absolute top-1 right-1 z-10 rounded-full bg-black/70 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                        <img
                          src={image.url}
                          alt={`Delivery photo ${index + 1}`}
                          className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      {(image.tag || image.note) && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
                          {image.tag && (
                            <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                              {image.tag}
                            </div>
                          )}
                          {image.note && (
                            <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate" title={image.note}>
                              {image.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {otherOrderImages.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Other photos
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {otherOrderImages.map((image, index) => (
                    <div
                      key={image.id}
                      onClick={() => window.open(image.url, '_blank')}
                      className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          window.open(image.url, '_blank');
                        }
                      }}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeImageFromOrder(image.id, image.url);
                          }}
                          className="absolute top-1 right-1 z-10 rounded-full bg-black/70 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                        <img
                          src={image.url}
                          alt={`Order photo ${index + 1}`}
                          className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      {(image.tag || image.note) && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5">
                          {image.tag && (
                            <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                              {image.tag}
                            </div>
                          )}
                          {image.note && (
                            <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate" title={image.note}>
                              {image.note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fulfillmentNotes.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fulfillment notes
                </div>
                <div className="space-y-2">
                  {fulfillmentNotes.map((note, index) => (
                    <div
                      key={`${note}-${index}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add photo
              </label>
              <button
                type="button"
                onClick={openResultImageModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Add Photo
              </button>
            </div>
          </div>
        </div>
      </div>

      <FulfillmentImageUploadModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        title={imageModalMode === 'reference' ? 'Add Reference Photo' : 'Add Fulfillment Photo'}
        submitLabel="Crop & Save"
        mobileOptimized={false}
        categoryOptions={imageModalMode === 'reference' ? [{ value: 'REFERENCE', label: 'Reference' }] : RESULT_IMAGE_CATEGORY_OPTIONS}
        defaultCategory={imageModalMode === 'reference' ? 'REFERENCE' : 'FULFILLED'}
        lockCategory={imageModalMode === 'reference'}
        tagSuggestions={imageModalMode === 'reference' ? REFERENCE_TAG_SUGGESTIONS : RESULT_TAG_SUGGESTIONS}
        initialImage={imageModalInitialImage}
        onSave={handleImageModalSave}
      />

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
                      toast.error('Please select an image or enter a URL');
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
