import { useState, useRef } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import LoadingButton from '@shared/ui/components/ui/button/LoadingButton';
import Select from '@shared/ui/forms/Select';

interface ParsedOrderData {
  orderNumber: string;
  orderSource: string;
  orderPlacedDate?: string | null;
  deliveryDate: string | null;
  deliveryTime?: string | null;
  sender?: {
    shopName: string;
    shopCode: string;
    phone: string;
  };
  recipient?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  address?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  product?: {
    code: string;
    description: string;
    fullText: string;
  };
  itemsSummary?: string;
  orderTotal: number;
  cardMessage?: string;
  specialInstructions?: string;
  occasion?: string;
}

interface ScanExternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

const PROVIDER_OPTIONS = [
  { value: 'FTD', label: 'FTD' },
  { value: 'DOORDASH', label: 'DoorDash' },
];

export default function ScanExternalOrderModal({
  isOpen,
  onClose,
  onOrderCreated
}: ScanExternalOrderModalProps) {
  const [step, setStep] = useState<'select-provider' | 'scan' | 'review'>('select-provider');
  const [provider, setProvider] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedOrderData | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleProviderSelect = () => {
    if (!provider) {
      setError('Please select a provider');
      return;
    }
    setError('');
    setStep('scan');
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setLoading(true);
    setError('');
    setParsedData(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('provider', provider);

      const response = await fetch('/api/orders/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan order');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setParsedData(result.data);
        setStep('review');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan order');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleCreateOrder = async () => {
    if (!parsedData) return;

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/orders/create-from-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsedData,
          externalSource: provider,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Special handling for duplicate orders
        if (response.status === 409 && result.existingOrderId) {
          setError(
            `${result.error || 'Order already exists'}. You can view it in the External Orders list.`
          );
        } else {
          throw new Error(result.error || 'Failed to create order');
        }
        return;
      }

      if (result.success) {
        onOrderCreated?.();
        handleClose();
      } else {
        throw new Error('Failed to create order');
      }
    } catch (err) {
      console.error('Create order error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep('select-provider');
    setProvider('');
    setParsedData(null);
    setError('');
    onClose();
  };

  const handleBack = () => {
    if (step === 'scan') {
      setStep('select-provider');
      setError('');
    } else if (step === 'review') {
      setStep('scan');
      setParsedData(null);
      setError('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Scan External Order
        </h2>

        {/* Step 1: Provider Selection */}
        {step === 'select-provider' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select the provider for this order:
            </p>

            <Select
              label="Provider"
              options={PROVIDER_OPTIONS}
              value={provider}
              onChange={setProvider}
              placeholder="Select provider"
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProviderSelect}
                disabled={!provider}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Scan */}
        {step === 'scan' && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Take a photo or upload an image of the {PROVIDER_OPTIONS.find(p => p.value === provider)?.label} order.
            </p>

            {/* File upload buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Camera capture (mobile) */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors"
              >
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Take Photo
                </span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* File upload (desktop) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors"
              >
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Upload Image/PDF
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Scanning order...</p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && parsedData && !loading && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Order scanned successfully!
              </p>
            </div>

            {/* Preview extracted data */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Extracted Information:</h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Order Number:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{parsedData.orderNumber}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Provider:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {PROVIDER_OPTIONS.find(p => p.value === provider)?.label}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Delivery Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {parsedData.deliveryDate || 'Not specified'}
                  </p>
                </div>
                {parsedData.deliveryTime && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Delivery Time:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{parsedData.deliveryTime}</p>
                  </div>
                )}

                {/* FTD-specific fields */}
                {provider === 'FTD' && parsedData.recipient && (
                  <>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Recipient:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {parsedData.recipient.firstName} {parsedData.recipient.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{parsedData.recipient.phone}</p>
                    </div>
                    {parsedData.address && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Address:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {parsedData.address.address1}
                          {parsedData.address.address2 && `, ${parsedData.address.address2}`}
                          <br />
                          {parsedData.address.city}, {parsedData.address.province} {parsedData.address.postalCode}
                        </p>
                      </div>
                    )}
                    {parsedData.product && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Product:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {parsedData.product.fullText}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* DoorDash-specific fields */}
                {provider === 'DOORDASH' && (
                  <>
                    {parsedData.recipient && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Pickup Name:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {parsedData.recipient.firstName} {parsedData.recipient.lastName}
                        </p>
                      </div>
                    )}
                    {parsedData.itemsSummary && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Items:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {parsedData.itemsSummary}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${parsedData.orderTotal.toFixed(2)}
                  </p>
                </div>

                {parsedData.cardMessage && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Card Message:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{parsedData.cardMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBack}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <LoadingButton
                onClick={handleCreateOrder}
                loading={creating}
                loadingText="Creating Order..."
                variant="primary"
              >
                Create Order
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
