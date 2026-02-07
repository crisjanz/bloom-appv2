import { useEffect, useRef, useCallback } from 'react';
import { useApiClient } from './useApiClient';

interface UseBarcodeSccannerOptions {
  enabled?: boolean;
  onProductFound: (product: any) => void;
  onCodeScanned?: (code: string) => boolean | Promise<boolean>;
  onError?: (error: string) => void;
}

/**
 * Hook to detect barcode scanner input and look up products.
 * Barcode scanners act like keyboards - they type very fast and press Enter.
 * This hook detects that pattern and looks up the scanned code as a SKU.
 */
export function useBarcodeScanner({
  enabled = true,
  onProductFound,
  onCodeScanned,
  onError,
}: UseBarcodeSccannerOptions) {
  const apiClient = useApiClient();
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  // Max time between keystrokes to be considered scanner input (ms)
  const MAX_KEY_INTERVAL = 50;
  // Min length for a valid barcode
  const MIN_BARCODE_LENGTH = 4;

  const lookupAndAddProduct = useCallback(
    async (code: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        if (onCodeScanned) {
          const handled = await Promise.resolve(onCodeScanned(code));
          if (handled) {
            return;
          }
        }

        // First try inventory lookup (searches by SKU)
        const response = await apiClient.get(`/api/inventory/lookup?sku=${encodeURIComponent(code)}`);

        if (response.status === 200 && response.data) {
          // Convert inventory item to product format for POS
          const item = response.data;

          // Build display name: "Product - Variant" or just "Product" if same
          const displayName = item.variantName &&
            item.variantName.toLowerCase() !== item.productName.toLowerCase()
            ? `${item.productName} - ${item.variantName}`
            : item.productName;

          const product = {
            id: `${item.productId}-${item.variantId}`, // Unique ID for cart
            name: displayName,
            price: item.price, // Already in cents from API
            variants: [{
              id: item.variantId,
              name: item.variantName,
              price: item.price,
              isDefault: true,
            }],
            categoryId: item.categoryId,
            isTaxable: true,
          };

          onProductFound(product);
        } else {
          onError?.(`Product not found: ${code}`);
        }
      } catch (error: any) {
        console.error('Barcode lookup failed:', error);
        onError?.(error?.response?.data?.error || `Product not found: ${code}`);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [apiClient, onProductFound, onError, onCodeScanned]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if focus is on an input/textarea/select
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // If too much time has passed, reset buffer
      if (timeSinceLastKey > MAX_KEY_INTERVAL && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      lastKeyTimeRef.current = now;

      if (event.key === 'Enter') {
        // Check if we have a valid barcode in the buffer
        const code = bufferRef.current.trim();
        if (code.length >= MIN_BARCODE_LENGTH) {
          event.preventDefault();
          lookupAndAddProduct(code);
        }
        bufferRef.current = '';
      } else if (event.key.length === 1) {
        // Only add printable characters
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, lookupAndAddProduct]);
}
