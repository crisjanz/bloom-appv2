import type { ApiClient } from '@shared/hooks/useApiClient';
import type { BackendOrderStatus, OrderType } from '@shared/utils/orderStatusHelpers';
import type { OrderImage, OrderImageCategory } from '@shared/hooks/useOrderImages';

export interface MobileFulfillmentOrderItem {
  id: string;
  customName?: string | null;
  description?: string | null;
  product?: {
    images?: string[] | null;
  } | null;
}

export interface MobileFulfillmentPerson {
  firstName?: string | null;
  lastName?: string | null;
}

export interface MobileFulfillmentAddress {
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  city?: string | null;
  province?: string | null;
}

export interface MobileFulfillmentOrder {
  id: string;
  orderNumber: string | number;
  status: string;
  paymentStatus?: string | null;
  type?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  cardMessage?: string | null;
  specialInstructions?: string | null;
  customer?: MobileFulfillmentPerson | null;
  recipientCustomer?: MobileFulfillmentPerson | null;
  recipientName?: string | null;
  deliveryAddress?: MobileFulfillmentAddress | null;
  orderItems?: MobileFulfillmentOrderItem[];
  orderImages?: OrderImage[];
}

export const RESULT_IMAGE_CATEGORY_VALUES: OrderImageCategory[] = ['FULFILLED', 'DELIVERED', 'OTHER'];

export const RESULT_IMAGE_CATEGORY_OPTIONS: Array<{ value: OrderImageCategory; label: string }> = [
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'OTHER', label: 'Other' }
];

export const REFERENCE_TAG_SUGGESTIONS = ['Model', 'Recipe', 'Inspiration', 'Color palette'];
export const RESULT_TAG_SUGGESTIONS = ['Studio', 'Final', 'Delivery proof', 'Issue'];

const extractErrorMessage = (payload: any, fallbackMessage: string) => {
  if (payload && typeof payload === 'object' && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return fallbackMessage;
};

export const mergeOrderImages = (existing: OrderImage[] = [], incoming: OrderImage[] = []): OrderImage[] => {
  const imageMap = new Map(existing.map((image) => [image.id, image]));

  incoming.forEach((image) => {
    imageMap.set(image.id, image);
  });

  return Array.from(imageMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const formatRecipientName = (order: MobileFulfillmentOrder) => {
  const recipientCustomerName = order.recipientCustomer
    ? `${order.recipientCustomer.firstName || ''} ${order.recipientCustomer.lastName || ''}`.trim()
    : '';
  if (recipientCustomerName) return recipientCustomerName;

  const deliveryAddressName = order.deliveryAddress
    ? `${order.deliveryAddress.firstName || ''} ${order.deliveryAddress.lastName || ''}`.trim()
    : '';
  if (deliveryAddressName) return deliveryAddressName;

  if (order.recipientName) return order.recipientName;

  if (order.customer) {
    const customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim();
    if (customerName) return customerName;
  }

  return 'Recipient';
};

export const formatAddress = (order: MobileFulfillmentOrder) => {
  const parts = [order.deliveryAddress?.address1, order.deliveryAddress?.city, order.deliveryAddress?.province].filter(Boolean);
  return parts.join(', ');
};

export const getReferenceImage = (order: MobileFulfillmentOrder) =>
  (order.orderImages || []).find((image) => image.category === 'REFERENCE');

export const getFallbackProductImage = (order: MobileFulfillmentOrder) => {
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  const productItem = items.find(
    (item) => Array.isArray(item.product?.images) && item.product.images.some((image) => Boolean(image))
  );

  if (!productItem || !Array.isArray(productItem.product?.images)) {
    return null;
  }

  return productItem.product.images.find((image) => Boolean(image)) || null;
};

export const getPrimaryItemName = (order: MobileFulfillmentOrder) => {
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  return items[0]?.customName || '';
};

export const toOrderType = (value: string | null | undefined): OrderType | undefined => {
  if (value === 'DELIVERY' || value === 'PICKUP') {
    return value;
  }

  return undefined;
};

export const toBackendStatus = (value: string): BackendOrderStatus | null => {
  const knownStatuses: BackendOrderStatus[] = [
    'DRAFT',
    'PAID',
    'IN_DESIGN',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
  ];

  return knownStatuses.includes(value as BackendOrderStatus) ? (value as BackendOrderStatus) : null;
};

export const fetchFulfillmentOrder = async (apiClient: ApiClient, orderId: string): Promise<MobileFulfillmentOrder> => {
  const response = await apiClient.get(`/api/orders/${orderId}`);
  if (response.status >= 400 || !response.data?.order) {
    throw new Error(extractErrorMessage(response.data, 'Failed to load order'));
  }

  return response.data.order as MobileFulfillmentOrder;
};

export const uploadOrderImageBlob = async (apiClient: ApiClient, croppedBlob: Blob): Promise<string> => {
  const formData = new FormData();
  const file = new File([croppedBlob], `order-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
  formData.append('images', file);

  const response = await apiClient.post('/api/orders/upload-images', formData);
  if (response.status >= 400) {
    throw new Error(extractErrorMessage(response.data, 'Failed to upload image'));
  }

  const uploadedImageUrls = Array.isArray(response.data?.imageUrls) ? response.data.imageUrls : [];
  const uploadedImageUrl = uploadedImageUrls[0];
  if (!uploadedImageUrl) {
    throw new Error('No image URL returned from upload');
  }

  return uploadedImageUrl;
};

export const patchFulfillmentStatus = async (
  apiClient: ApiClient,
  orderId: string,
  status: BackendOrderStatus
): Promise<void> => {
  const response = await apiClient.patch(`/api/orders/${orderId}/status`, { status });
  if (response.status >= 400 || response.data?.success === false) {
    throw new Error(extractErrorMessage(response.data, 'Failed to update status'));
  }
};

const PRODUCT_CODE_PATTERN = /\b([A-Z]{2,3}\d{1,2}-\d+[A-Z]?|[A-Z]\d{1,2}-\d+[A-Z]?)\b/i;

const trimTrailingPunctuation = (value: string) => value.replace(/[),.;:!?]+$/, '');

const getImageFromProductSearchResult = (result: any): string | null => {
  if (!result || typeof result !== 'object' || !Array.isArray(result.images)) {
    return null;
  }

  const firstImage = result.images.find((image: unknown) => typeof image === 'string' && image.trim().length > 0);
  return typeof firstImage === 'string' ? firstImage : null;
};

export const extractSourceUrlFromText = (text: string): string | null => {
  if (!text) return null;

  const explicitUrlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
  for (const match of explicitUrlMatches) {
    const candidate = trimTrailingPunctuation(match.trim());
    if (candidate) return candidate;
  }

  const domainPathMatches = text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]+)?/gi) || [];
  for (const match of domainPathMatches) {
    const candidate = trimTrailingPunctuation(match.trim());
    if (candidate) return candidate;
  }

  return null;
};

export const extractSourceUrlFromOrder = (order: MobileFulfillmentOrder): string | null => {
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];

  for (const item of items) {
    const descriptionCandidate = extractSourceUrlFromText(item.description || '');
    if (descriptionCandidate) return descriptionCandidate;

    const customNameCandidate = extractSourceUrlFromText(item.customName || '');
    if (customNameCandidate) return customNameCandidate;
  }

  return null;
};

export const resolveReferenceProductImage = async (
  apiClient: ApiClient,
  order: MobileFulfillmentOrder
): Promise<string | null> => {
  const directProductImage = getFallbackProductImage(order);
  if (directProductImage) {
    return directProductImage;
  }

  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  const firstItem = items[0];
  const nameCandidate = (firstItem?.customName || '').split(' - ')[0]?.trim() || '';

  if (nameCandidate) {
    try {
      const response = await apiClient.get(`/api/products/search?q=${encodeURIComponent(nameCandidate)}`);
      if (response.status < 400 && Array.isArray(response.data)) {
        const normalizedName = nameCandidate.toLowerCase();
        const exactMatch = response.data.find(
          (product: any) =>
            typeof product?.name === 'string' &&
            product.name.toLowerCase() === normalizedName &&
            getImageFromProductSearchResult(product)
        );

        const exactMatchImage = exactMatch ? getImageFromProductSearchResult(exactMatch) : null;
        if (exactMatchImage) {
          return exactMatchImage;
        }

        const firstWithImage = response.data.find((product: any) => getImageFromProductSearchResult(product));
        const firstWithImageUrl = firstWithImage ? getImageFromProductSearchResult(firstWithImage) : null;
        if (firstWithImageUrl) {
          return firstWithImageUrl;
        }
      }
    } catch (error) {
      console.error('Failed catalog image lookup for mobile reference:', error);
    }
  }

  const codeSearchText = `${firstItem?.description || ''} ${firstItem?.customName || ''}`.trim();
  const codeMatch = codeSearchText.match(PRODUCT_CODE_PATTERN);
  const productCode = codeMatch?.[1];

  if (productCode) {
    try {
      const response = await apiClient.get(`/api/wire-products/${encodeURIComponent(productCode)}`);
      if (response.status < 400 && response.data?.product?.imageUrl) {
        return String(response.data.product.imageUrl);
      }
    } catch (error) {
      // Missing wire product is common; avoid noisy UI failures.
    }
  }

  return null;
};
