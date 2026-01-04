import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, CheckCircleIcon } from '@shared/assets/icons';
import Select from '@shared/ui/forms/Select';

interface ParsedOrderData {
  orderNumber: string;
  orderSource: string;
  orderPlacedDate?: string | null;
  deliveryDate?: string | null;
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
  orderTotal?: number | null;
  cardMessage?: string | null;
  itemsSummary?: string | null;
  specialInstructions?: string;
  occasion?: string;
}

type ExternalProvider = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
};

export default function MobileScanPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedOrderData | null>(null);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string } | null>(null);
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider || providers.length === 0) return;
    const defaultProvider = providers.find((p) => p.code === 'FTD') || providers[0];
    if (defaultProvider) {
      setSelectedProvider(defaultProvider.code);
    }
  }, [providers, selectedProvider]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/external-providers');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load external providers:', error);
    }
  };

  const providerOptions = providers
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      value: p.code,
      label: p.name,
    }));

  const providerSelect = providerOptions.length ? (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <Select
        label="Select Provider"
        options={providerOptions}
        value={selectedProvider}
        onChange={setSelectedProvider}
        placeholder="Choose provider"
        disabled={loading || !!parsedData}
      />
    </div>
  ) : null;

  const isDoorDash = parsedData?.orderSource === 'DOORDASH';
  const itemsSummary = parsedData?.itemsSummary || parsedData?.product?.fullText || '';
  const hasRecipient =
    !!parsedData?.recipient?.firstName ||
    !!parsedData?.recipient?.lastName ||
    !!parsedData?.recipient?.phone;
  const hasAddress = !!parsedData?.address?.address1;
  const ftdProductTotal = parsedData?.orderTotal != null ? parsedData.orderTotal - 15 : null;

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!selectedProvider) {
      setError('Select a provider before scanning');
      return;
    }

    setLoading(true);
    setError('');
    setParsedData(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('provider', selectedProvider);

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
        setAddressValid(result.addressValid ?? null);
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

  const handleScanAnother = () => {
    setParsedData(null);
    setError('');
    setAddressValid(null);
    setCreatedOrder(null);
  };

  const handleCreateOrder = async () => {
    if (!parsedData || !selectedProvider) return;

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/orders/create-from-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsedData,
          externalSource: selectedProvider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();
      setCreatedOrder(result.order);
    } catch (err) {
      console.error('Create order error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/mobile')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeftIcon className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Scan Order
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!parsedData && !loading && (
          <div className="space-y-6">
            {providerSelect}
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Take a photo of your order form
            </p>

            {/* Camera Button */}
            <button
              onClick={() => selectedProvider && fileInputRef.current?.click()}
              disabled={!selectedProvider}
              className={`w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 flex flex-col items-center gap-4 active:scale-95 transition-transform ${
                !selectedProvider ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Tap to Scan
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-500 mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-400">Scanning order...</p>
          </div>
        )}

        {parsedData && !loading && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 flex items-center gap-4">
              <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Order Scanned!</p>
                <p className="text-sm text-green-700 dark:text-green-300">#{parsedData.orderNumber}</p>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Order Details
              </h3>

              <div className="space-y-3">
                {parsedData.sender && !isDoorDash && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">From Shop</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {parsedData.sender.shopName} #{parsedData.sender.shopCode}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {parsedData.sender.phone}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {isDoorDash ? 'Pickup Date' : 'Delivery Date'}
                  </span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {parsedData.deliveryDate || 'Not specified'}
                  </p>
                </div>

                {parsedData.deliveryTime && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isDoorDash ? 'Pickup Time' : 'Delivery Time'}
                    </span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {parsedData.deliveryTime}
                    </p>
                  </div>
                )}

                {hasRecipient && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isDoorDash ? 'Customer' : 'Recipient'}
                    </span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {parsedData.recipient?.firstName} {parsedData.recipient?.lastName}
                    </p>
                    {parsedData.recipient?.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {parsedData.recipient.phone}
                      </p>
                    )}
                  </div>
                )}

                {hasAddress && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Address</span>
                      {addressValid === true && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Validated
                        </span>
                      )}
                      {addressValid === false && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Not Found
                        </span>
                      )}
                    </div>
                    {addressValid === false && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 mb-2">
                        <p className="text-xs text-red-800 dark:text-red-200">
                          Address could not be verified. Call customer to confirm before delivery.
                        </p>
                      </div>
                    )}
                    <p className="font-medium text-gray-900 dark:text-white">
                      {parsedData.address?.address1}
                      {parsedData.address?.address2 && <br />}
                      {parsedData.address?.address2}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {parsedData.address?.city}, {parsedData.address?.province} {parsedData.address?.postalCode}
                    </p>
                  </div>
                )}

                {isDoorDash ? (
                  <>
                    {itemsSummary && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Items</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {itemsSummary}
                        </p>
                      </div>
                    )}
                    {parsedData.orderTotal != null && (
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${parsedData.orderTotal.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  parsedData.product && parsedData.orderTotal != null && (
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Product</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {parsedData.product.fullText}
                      </p>
                      <div className="text-sm space-y-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Product:</span>
                          <span className="font-medium">${ftdProductTotal?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
                          <span className="font-medium">$15.00</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
                          <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                          <span className="font-semibold text-brand-600 dark:text-brand-400">${parsedData.orderTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {parsedData.cardMessage && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Card Message</span>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {parsedData.cardMessage}
                    </p>
                  </div>
                )}

                {parsedData.specialInstructions && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Instructions</span>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {parsedData.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {providerSelect}

            {/* Actions */}
            <div className="space-y-3">
              {!createdOrder ? (
                <>
                  <button
                    onClick={handleCreateOrder}
                    disabled={creating || !selectedProvider}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl active:scale-95 transition-transform disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating Order...' : 'Create Order'}
                  </button>
                  <button
                    onClick={handleScanAnother}
                    className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold py-4 rounded-xl active:scale-95 transition-transform"
                  >
                    Scan Another Order
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Order Created!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      #{createdOrder.orderNumber}
                    </p>
                  </div>
                  <button
                    onClick={handleScanAnother}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-xl active:scale-95 transition-transform"
                  >
                    Scan Another Order
                  </button>
                </>
              )}
              <button
                onClick={() => navigate('/mobile')}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold py-4 rounded-xl active:scale-95 transition-transform"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
