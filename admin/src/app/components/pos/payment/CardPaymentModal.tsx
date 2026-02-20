// components/pos/payment/CardPaymentModal.tsx - Simplified Stripe-only flow
import { useState, useEffect } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Modal } from '@shared/ui/components/ui/modal';
import stripeService from '@shared/legacy-services/stripeService';
import { CreditCardIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import { formatCurrency } from '@shared/utils/currency';

type Props = {
  open: boolean;
  total: number;
  cardType: 'credit' | 'debit';
  orderIds?: string[];
  bloomCustomerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  defaultMode?: 'main' | 'manual';
  onComplete: (paymentData: {
    method: string;
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
    cardFingerprint?: string;
  }) => void;
  onCancel: () => void;
  embedded?: boolean;
};

type ViewMode = 'main' | 'manual';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const cardElementOptions = {
  hidePostalCode: true,
  style: {
    base: {
      fontSize: '16px',
      color: '#111827',
      '::placeholder': {
        color: '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
    },
  },
};

type ManualCardEntryFormProps = {
  total: number;
  cardType: 'credit' | 'debit';
  orderIds?: string[];
  bloomCustomerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  onError: (message: string | null) => void;
  onComplete: (paymentData: {
    method: string;
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
    cardFingerprint?: string;
  }) => void;
  onBack: () => void;
};

const ManualCardEntryForm = ({
  total,
  cardType,
  orderIds,
  bloomCustomerId,
  customerEmail,
  customerPhone,
  customerName,
  isProcessing,
  onProcessingChange,
  onError,
  onComplete,
  onBack,
}: ManualCardEntryFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [postalCode, setPostalCode] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const handleManualCharge = async () => {
    if (!stripe || !elements) {
      onError('Stripe is still loading. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card input is not ready.');
      return;
    }

    onProcessingChange(true);
    onError(null);

    try {
      const paymentIntentResult = await stripeService.createPaymentIntent({
        amount: total,
        currency: 'cad',
        customerEmail,
        customerPhone,
        customerName,
        orderIds,
        bloomCustomerId,
        metadata: saveCard ? { saveCard: 'true' } : undefined,
      });

      const paymentMethodResult = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: postalCode ? { postal_code: postalCode } : undefined,
        },
      });

      if (paymentMethodResult.error || !paymentMethodResult.paymentMethod?.id) {
        throw new Error(paymentMethodResult.error?.message || 'Failed to create payment method');
      }

      const confirmResult = await stripeService.confirmPaymentIntent(
        paymentIntentResult.paymentIntentId,
        paymentMethodResult.paymentMethod.id
      );

      if (!confirmResult?.success || confirmResult.status !== 'succeeded') {
        throw new Error(confirmResult?.error || 'Payment failed');
      }

      onComplete({
        method: cardType,
        transactionId: confirmResult.paymentIntentId,
        paymentIntentId: confirmResult.paymentIntentId,
        cardLast4: confirmResult.cardLast4,
        cardBrand: confirmResult.cardBrand,
        cardFingerprint: confirmResult.cardFingerprint,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      onProcessingChange(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <CardElement options={cardElementOptions} onReady={() => setCardReady(true)} />
      </div>

      <InputField
        label="ZIP Code"
        type="text"
        value={postalCode}
        onChange={(e) => setPostalCode(e.target.value.toUpperCase().slice(0, 7))}
        placeholder="V2N 2N2"
        disabled={isProcessing}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="saveCard"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          disabled={isProcessing}
          className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
        />
        <label htmlFor="saveCard" className="text-sm text-gray-700 dark:text-gray-300">
          Save card for future payments
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleManualCharge}
          disabled={isProcessing || !stripe || !elements || !cardReady}
          className="flex-1 px-4 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </div>
          ) : (
            'Charge Card'
          )}
        </button>
      </div>
    </div>
  );
};

export default function CardPaymentModal({
  open,
  total,
  cardType,
  orderIds,
  bloomCustomerId,
  customerEmail,
  customerPhone,
  customerName,
  defaultMode = 'main',
  onComplete,
  onCancel,
  embedded = false,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readerConnected, setReaderConnected] = useState(false);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [terminalReaderId, setTerminalReaderId] = useState<string | null>(null);
  const [terminalReaderLabel, setTerminalReaderLabel] = useState<string | null>(null);
  const [terminalPaymentIntentId, setTerminalPaymentIntentId] = useState<string | null>(null);
  const [terminalPolling, setTerminalPolling] = useState(false);

  // Check reader connection on mount
  useEffect(() => {
    if (open) {
      checkReaderConnection();
    }
  }, [open]);

  const checkReaderConnection = async () => {
    try {
      const response = await fetch('/api/stripe/terminal/readers');
      if (!response.ok) {
        setReaderConnected(false);
        setTerminalReaderId(null);
        setTerminalReaderLabel(null);
        return;
      }
      const result = await response.json();
      const readers = Array.isArray(result.readers) ? result.readers : [];
      const onlineReader =
        readers.find((reader: any) => reader?.status === 'online') || readers[0];

      if (onlineReader?.id) {
        setReaderConnected(onlineReader.status === 'online');
        setTerminalReaderId(onlineReader.id);
        setTerminalReaderLabel(onlineReader.label || onlineReader.deviceType || 'Stripe Reader');
      } else {
        setReaderConnected(false);
        setTerminalReaderId(null);
        setTerminalReaderLabel(null);
      }
    } catch (err) {
      setReaderConnected(false);
      setTerminalReaderId(null);
      setTerminalReaderLabel(null);
    }
  };

  // Load saved cards when entering manual mode, clear when no customer
  useEffect(() => {
    if (viewMode === 'manual' && (customerEmail || customerPhone || bloomCustomerId)) {
      loadSavedCards();
    } else {
      setSavedCards([]);
    }
  }, [viewMode, customerEmail, customerPhone, bloomCustomerId]);

  const loadSavedCards = async () => {
    if (!customerEmail && !customerPhone && !bloomCustomerId) return;

    setLoadingSavedCards(true);
    try {
      const result = await stripeService.getCustomerPaymentMethods(
        customerPhone || '',
        customerEmail || '',
        bloomCustomerId
      );

      if (result.success && result.paymentMethods) {
        setSavedCards(result.paymentMethods.map(pm => ({
          ...pm,
          brand: pm.brand || pm.type || 'card'
        })));
      }
    } catch (err) {
      console.error('Failed to load saved cards:', err);
    } finally {
      setLoadingSavedCards(false);
    }
  };

  // Main action: Charge via terminal
  const handleChargeTerminal = async () => {
    if (!readerConnected || !terminalReaderId) {
      setError('No card reader connected. Please use Manual Entry.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/terminal/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          readerId: terminalReaderId,
          customerEmail,
          customerPhone,
          customerName,
          orderIds,
          bloomCustomerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start terminal payment');
      }

      const result = await response.json();
      setTerminalPaymentIntentId(result.paymentIntentId);
      setTerminalPolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  // Charge with saved card
  const handleSavedCardCharge = async (card: SavedCard) => {
    setIsProcessing(true);
    setError(null);

    try {
      const paymentIntentResult = await stripeService.createPaymentIntent({
        amount: total,
        currency: 'cad',
        customerEmail,
        customerPhone,
        customerName,
        orderIds,
        bloomCustomerId,
      });

      const confirmResult = await stripeService.confirmPaymentIntent(
        paymentIntentResult.paymentIntentId,
        card.id
      );

      if (!confirmResult?.success || confirmResult.status !== 'succeeded') {
        throw new Error(confirmResult?.error || 'Payment failed');
      }

      onComplete({
        method: cardType,
        transactionId: confirmResult.paymentIntentId,
        paymentIntentId: confirmResult.paymentIntentId,
        cardLast4: confirmResult.cardLast4 || card.last4,
        cardBrand: confirmResult.cardBrand || card.brand,
        cardFingerprint: confirmResult.cardFingerprint,
      });
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setViewMode(defaultMode);
      setError(null);
      setTerminalPaymentIntentId(null);
      setTerminalPolling(false);
      onCancel();
    }
  };

  useEffect(() => {
    if (!terminalPaymentIntentId || !terminalPolling) return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/stripe/terminal/payment-status/${terminalPaymentIntentId}`);
        if (!response.ok) return;
        const result = await response.json();

        if (cancelled) return;

        if (result.status === 'succeeded') {
          setTerminalPolling(false);
          setTerminalPaymentIntentId(null);
          setIsProcessing(false);
          onComplete({
            method: cardType,
            transactionId: result.paymentIntentId,
            paymentIntentId: result.paymentIntentId,
            cardLast4: result.cardLast4,
            cardBrand: result.cardBrand,
            cardFingerprint: result.cardFingerprint,
          });
        } else if (['canceled', 'requires_payment_method'].includes(result.status)) {
          setTerminalPolling(false);
          setTerminalPaymentIntentId(null);
          setIsProcessing(false);
          setError('Terminal payment was canceled or failed.');
        }
      } catch (err) {
        if (!cancelled) {
          setTerminalPolling(false);
          setTerminalPaymentIntentId(null);
          setIsProcessing(false);
          setError(err instanceof Error ? err.message : 'Failed to check terminal payment status');
        }
      }
    };

    const interval = setInterval(pollStatus, 2000);
    void pollStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [terminalPaymentIntentId, terminalPolling, cardType, onComplete]);

  const handleTerminalCancel = async () => {
    if (!terminalReaderId) return;
    try {
      await fetch(`/api/stripe/terminal/cancel-action/${terminalReaderId}`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to cancel terminal action:', err);
    } finally {
      setTerminalPolling(false);
      setTerminalPaymentIntentId(null);
      setIsProcessing(false);
      setError('Terminal payment canceled.');
    }
  };

  const modalContent = (
    <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <CreditCardIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {viewMode === 'main' ? 'Charge Credit Card' : 'Manual Card Entry'}
            </h2>
          </div>
          {viewMode === 'manual' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-16">
              Amount: {formatCurrency(total)}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Main View */}
        {viewMode === 'main' && (
          <div className="space-y-8">
            {/* Total Amount */}
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(total)}
              </div>
            </div>

            {/* Charge Button */}
            {!terminalPaymentIntentId ? (
              <button
                onClick={handleChargeTerminal}
                disabled={isProcessing || !readerConnected}
                className={`w-full h-20 rounded-2xl font-semibold text-xl transition-all ${
                  isProcessing
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-wait'
                    : readerConnected
                    ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400 dark:text-gray-500'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Charge Card'
                )}
              </button>
            ) : (
              <div className="rounded-2xl border border-brand-500/30 bg-brand-50 px-4 py-4 text-center">
                <div className="text-sm font-semibold text-brand-600">Waiting for customer…</div>
                <div className="text-xs text-gray-500 mt-1">
                  {terminalReaderLabel ? `Reader: ${terminalReaderLabel}` : 'Reader is ready'}
                </div>
                <button
                  onClick={handleTerminalCancel}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Bottom Row: Reader Status + Manual Entry */}
            <div className="flex items-center justify-between">
              {/* Reader Status */}
              <div className="flex items-center gap-2 text-sm">
                {readerConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Reader Connected</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Reader Not Connected</span>
                  </>
                )}
              </div>

              {/* Manual Entry Button */}
              <button
                onClick={() => setViewMode('manual')}
                disabled={isProcessing}
                className="px-6 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Manual Entry
              </button>
            </div>
          </div>
        )}

        {/* Manual Entry View */}
        {viewMode === 'manual' && (
          <div className="space-y-4">
            {/* Saved Cards */}
            {savedCards.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Saved Cards
                </h3>
                <div className="space-y-2">
                  {savedCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleSavedCardCharge(card)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCardIcon className="w-5 h-5 text-gray-500" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {card.brand} •••• {card.last4}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Expires {card.expMonth}/{card.expYear}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-brand-500 font-medium">Use</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Or Enter New Card
                  </p>
                </div>
              </div>
            )}

            {loadingSavedCards && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
                <p className="text-sm text-gray-500 mt-2">Loading saved cards...</p>
              </div>
            )}

            <Elements stripe={stripeService.getStripe()}>
              <ManualCardEntryForm
                total={total}
                cardType={cardType}
                orderIds={orderIds}
                bloomCustomerId={bloomCustomerId}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                customerName={customerName}
                isProcessing={isProcessing}
                onProcessingChange={setIsProcessing}
                onError={setError}
                onComplete={onComplete}
                onBack={() => setViewMode('main')}
              />
            </Elements>
          </div>
        )}
    </div>
  );

  if (embedded) return modalContent;

  return (
    <Modal isOpen={open} onClose={handleClose} className="max-w-md">
      {modalContent}
    </Modal>
  );
}
