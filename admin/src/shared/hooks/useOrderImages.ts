import { useCallback } from 'react';
import { useApiClient } from './useApiClient';

export type OrderImageCategory = 'REFERENCE' | 'FULFILLED' | 'DELIVERED' | 'OTHER';

export interface OrderImage {
  id: string;
  orderId: string;
  category: OrderImageCategory;
  url: string;
  tag?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveOrderImageInput {
  category: OrderImageCategory;
  url: string;
  tag?: string | null;
  note?: string | null;
}

const ensureResponse = <T,>(status: number, data: any, fallbackMessage: string): T => {
  if (status >= 400) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as any).error)
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
};

export function useOrderImages() {
  const apiClient = useApiClient();

  const addOrderImage = useCallback(
    async (orderId: string, payload: SaveOrderImageInput) => {
      const { data, status } = await apiClient.post(`/api/orders/${orderId}/images`, payload);
      const parsed = ensureResponse<{ image: OrderImage }>(status, data, 'Failed to save order image');
      return parsed.image;
    },
    [apiClient]
  );

  const addOrderImages = useCallback(
    async (orderId: string, payload: { images: SaveOrderImageInput[] }) => {
      const { data, status } = await apiClient.post(`/api/orders/${orderId}/images/bulk`, payload);
      const parsed = ensureResponse<{ images: OrderImage[] }>(status, data, 'Failed to save order images');
      return parsed.images;
    },
    [apiClient]
  );

  const deleteOrderImage = useCallback(
    async (orderId: string, imageId: string) => {
      const { data, status } = await apiClient.delete(`/api/orders/${orderId}/images/${imageId}`);
      ensureResponse(status, data, 'Failed to delete order image');
    },
    [apiClient]
  );

  return {
    addOrderImage,
    addOrderImages,
    deleteOrderImage
  };
}

export default useOrderImages;
