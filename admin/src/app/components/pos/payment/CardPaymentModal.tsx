// components/pos/payment/CardPaymentModal.tsx - Simplified Stripe-only flow
import { useState, useEffect } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import stripeService from '@shared/legacy-services/stripeService';
import { CreditCardIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import { formatCurrency } from '@shared/utils/currency';

type Props = {
  open: boolean;
  total: number;
  cardType: 'credit' | 'debit';
  orderIds?: string[];
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  defaultMode?: 'main' | 'manual';
  onComplete: (paymentData: {
    method: string;
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
  }) => void;
  onCancel: () => void;
};

type ViewMode = 'main' | 'manual';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export default function CardPaymentModal({
  open,
  total,
  cardType,
  orderIds,
  customerEmail,
  customerPhone,
  customerName,
  defaultMode = 'main',
  onComplete,
  onCancel
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readerConnected, setReaderConnected] = useState(false);

  // Manual entry state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>('');

  // Check reader connection on mount
  useEffect(() => {
    if (open) {
      checkReaderConnection();
    }
  }, [open]);

  const checkReaderConnection = async () => {
    try {
      // TODO: Implement terminal connection check
      // const connected = await stripeService.isTerminalConnected();
      setReaderConnected(false);
    } catch (err) {
      setReaderConnected(false);
    }
  };

  // Load saved cards when entering manual mode
  useEffect(() => {
    if (viewMode === 'manual' && (customerEmail || customerPhone)) {
      loadSavedCards();
    }
  }, [viewMode, customerEmail, customerPhone]);

  const loadSavedCards = async () => {
    if (!customerEmail && !customerPhone) return;

    setLoadingSavedCards(true);
    try {
      const result = await stripeService.getCustomerPaymentMethods(
        customerPhone || '',
        customerEmail || ''
      );

      if (result.success && result.paymentMethods) {
        setSavedCards(result.paymentMethods.map(pm => ({
          ...pm,
          brand: pm.type || 'card'
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
    if (!readerConnected) {
      setError('No card reader connected. Please use Manual Entry.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Implement terminal payment collection
      setError('Terminal payments not yet implemented. Please use Manual Entry.');
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  // Manual entry: Charge with card details
  const handleManualCharge = async () => {
    if (!cardNumber || !expiry || !cvv) {
      setError('Please fill in all card details');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Implement manual card charging
      setError('Manual card entry not yet implemented.');
      setIsProcessing(false);
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
      // TODO: Implement saved card charging
      setError('Saved card charging not yet implemented.');
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  // Format helpers
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleClose = () => {
    if (!isProcessing) {
      setViewMode(defaultMode);
      setError(null);
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setPostalCode('');
      setSaveCard(false);
      onCancel();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      className="max-w-md"
    >
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

            {/* Card Form */}
            <div className="space-y-3">
              <InputField
                label="Card Number"
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                disabled={isProcessing}
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Expiry (MM/YY)"
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="12/25"
                  maxLength={5}
                  disabled={isProcessing}
                />
                <InputField
                  label="CVV"
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  disabled={isProcessing}
                />
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setViewMode('main')}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleManualCharge}
                disabled={isProcessing || !cardNumber || !expiry || !cvv}
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
        )}
      </div>
    </Modal>
  );
}
