// components/pos/payment/CardPaymentModal.tsx
import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import stripeService from '@shared/legacy-services/stripeService';

type PaymentProvider = 'stripe' | 'square';
type PaymentMode = 'terminal' | 'manual';

type Props = {
  open: boolean;
  total: number;
  cardType: 'credit' | 'debit';
  orderIds?: string[];
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  initialProvider?: PaymentProvider;
  initialMode?: PaymentMode;
  onComplete: (paymentData: { 
    method: string; 
    provider: PaymentProvider;
    transactionId?: string;
    paymentIntentId?: string;
  }) => void;
  onCancel: () => void;
};

// Square Manual Entry Form Component
function SquareManualEntryForm({ total, orderIds, customerEmail, customerPhone, customerName, onComplete, onCancel }: {
  total: number;
  orderIds?: string[];
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  onComplete: (data: any) => void;
  onCancel: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!cardNumber || !expiry || !cvv) {
      setError('Please fill in all card details');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Create a card nonce (mock for now - in production would use Square Web Payments SDK)
      const mockNonce = `cnon:card-nonce-ok-${Date.now()}`;
      
      // Step 2: Process payment through our Square API
      const response = await fetch('http://localhost:4000/api/square/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          currency: 'CAD',
          sourceId: mockNonce,
          customerEmail,
          customerPhone,
          customerName,
          description: `Bloom Order${orderIds && orderIds.length > 1 ? 's' : ''} ${orderIds?.join(', ') || ''}`,
          orderIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const result = await response.json();
      
      // Step 3: Complete the payment
      onComplete({
        method: 'credit_square_manual',
        provider: 'square',
        transactionId: result.paymentId,
        cardLast4: cardNumber.slice(-4),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-black dark:text-white mb-2">
          Card Number
        </label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white"
        />
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            Expiry
          </label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            maxLength={5}
            className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white mb-2">
            CVV
          </label>
          <input
            type="text"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
            placeholder="123"
            maxLength={4}
            className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white"
          />
        </div>
      </div>

      {/* Postal Code */}
      <div>
        <label className="block text-sm font-medium text-black dark:text-white mb-2">
          Postal Code
        </label>
        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
          placeholder="K1A 0A6"
          className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-boxdark text-black dark:text-white"
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isProcessing || !cardNumber || !expiry || !cvv}
          className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

// Stripe Payment Form Component
function StripePaymentForm({ onComplete, onCancel }: {
  onComplete: (data: any) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm payment using the existing payment intent
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onComplete({
          method: 'credit_stripe',
          provider: 'stripe',
          transactionId: paymentIntent.id,
          paymentIntentId: paymentIntent.id,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-stroke dark:border-strokedark rounded-xl">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Complete Payment'}
        </button>
      </div>
    </form>
  );
}

export default function CardPaymentModal({
  open,
  total,
  cardType,
  orderIds,
  customerEmail,
  customerPhone,
  customerName,
  initialProvider,
  initialMode,
  onComplete,
  onCancel,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialMode ?? 'terminal');
  const [provider, setProvider] = useState<PaymentProvider>(initialProvider ?? 'square');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<Array<{
    id: string;
    type: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }>>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [showSavedCards, setShowSavedCards] = useState(false);
  const [savedCardCustomer, setSavedCardCustomer] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setIsProcessing(false);
      setPaymentMode(initialMode ?? 'terminal');
      setProvider(initialProvider ?? 'square');
      setClientSecret(null);
      setSavedCards([]);
      setSelectedSavedCard(null);
      setShowSavedCards(false);
      setSavedCardCustomer(null);
      
      // Load saved cards if we have customer contact info
      if (customerPhone || customerEmail) {
        loadSavedCards();
      }
    }
  }, [open, customerPhone, customerEmail, initialMode, initialProvider]);

  useEffect(() => {
    // Initialize Stripe payment intent when switching to manual mode with Stripe
    if (paymentMode === 'manual' && provider === 'stripe' && open) {
      initializeStripePayment();
    }
    
    // Reload saved cards when provider changes
    if (paymentMode === 'manual' && open && (customerPhone || customerEmail)) {
      setSavedCards([]);
      setSelectedSavedCard(null);
      setShowSavedCards(false);
      setSavedCardCustomer(null);
      loadSavedCards();
    }
  }, [paymentMode, provider, open]);

  const loadSavedCards = async () => {
    try {
      if (provider === 'stripe') {
        const result = await stripeService.getCustomerPaymentMethods(customerPhone, customerEmail);
        if (result.success && result.paymentMethods.length > 0) {
          setSavedCards(result.paymentMethods);
          setSavedCardCustomer(result.customer);
          setShowSavedCards(true);
          console.log(`✅ Loaded ${result.paymentMethods.length} Stripe saved cards for customer`);
        }
      } else if (provider === 'square') {
        const result = await stripeService.getSquareCustomerPaymentMethods(customerPhone, customerEmail);
        if (result.success && result.paymentMethods.length > 0) {
          setSavedCards(result.paymentMethods);
          setSavedCardCustomer(result.customer);
          setShowSavedCards(true);
          console.log(`✅ Loaded ${result.paymentMethods.length} Square saved cards for customer`);
        }
      }
    } catch (error) {
      console.error('Failed to load saved cards:', error);
    }
  };

  const initializeStripePayment = async () => {
    try {
      // Create payment intent to get clientSecret
      const { clientSecret } = await stripeService.createPaymentIntent({
        amount: total,
        currency: 'cad',
        customerEmail,
        customerPhone,
        customerName,
        orderIds,
        description: `Bloom Order${orderIds && orderIds.length > 1 ? 's' : ''} ${orderIds?.join(', ') || ''}`,
      });

      setClientSecret(clientSecret);
    } catch (error) {
      console.error('Failed to initialize Stripe payment:', error);
    }
  };

  const handleTerminalPayment = async () => {
    setIsProcessing(true);
    
    try {
      if (provider === 'square') {
        // Square terminal integration
        await new Promise(resolve => setTimeout(resolve, 3000));
        onComplete({
          method: `${cardType}_square`,
          provider: 'square',
          transactionId: `sq_${Date.now()}`
        });
      } else {
        // Stripe terminal integration
        await new Promise(resolve => setTimeout(resolve, 3000));
        onComplete({
          method: `${cardType}_stripe_terminal`,
          provider: 'stripe',
          transactionId: `spt_${Date.now()}`
        });
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('Terminal payment failed:', error);
    }
  };

  const handleStripePaymentComplete = (paymentData: any) => {
    onComplete(paymentData);
  };

  const handleSavedCardPayment = async () => {
    if (!selectedSavedCard || !savedCardCustomer) return;
    
    setIsProcessing(true);
    try {
      if (provider === 'stripe') {
        // Stripe saved card payment
        let paymentClientSecret = clientSecret;
        if (!paymentClientSecret) {
          const result = await stripeService.createPaymentIntent({
            amount: total,
            currency: 'cad',
            customerEmail,
            customerPhone,
            customerName,
            orderIds,
            description: `Bloom Order${orderIds && orderIds.length > 1 ? 's' : ''} ${orderIds?.join(', ') || ''}`,
          });
          paymentClientSecret = result.clientSecret;
        }

        const stripe = await stripeService.getStripe();
        if (!stripe) {
          throw new Error('Stripe not initialized');
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
          clientSecret: paymentClientSecret,
          confirmParams: {
            payment_method: selectedSavedCard,
            return_url: `${window.location.origin}/orders`,
          },
          redirect: 'if_required',
        });

        if (error) {
          console.error('❌ Stripe saved card payment error:', error);
          throw new Error(error.message || 'Payment failed');
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
          console.log('✅ Stripe saved card payment succeeded:', paymentIntent.id);
          onComplete({
            method: 'credit_stripe_saved',
            provider: 'stripe',
            transactionId: paymentIntent.id,
            paymentIntentId: paymentIntent.id,
          });
        } else {
          throw new Error('Payment not completed');
        }
      } else if (provider === 'square') {
        // Square saved card payment
        const result = await stripeService.processSquareSavedCardPayment({
          amount: total,
          customerId: savedCardCustomer.id,
          customerCardId: selectedSavedCard,
          description: `Bloom Order${orderIds && orderIds.length > 1 ? 's' : ''} ${orderIds?.join(', ') || ''}`,
          orderIds,
        });

        if (result.success) {
          console.log('✅ Square saved card payment succeeded:', result.paymentId);
          onComplete({
            method: 'credit_square_saved',
            provider: 'square',
            transactionId: result.paymentId,
          });
        } else {
          throw new Error('Square payment failed');
        }
      }
    } catch (error) {
      console.error('❌ Saved card payment failed:', error);
      setIsProcessing(false);
      // Could add error state here to show user
    }
  };

  if (!open) return null;

  const cardIcon = cardType === 'credit' ? '💳' : '💳';
  const cardLabel = cardType === 'credit' ? 'Credit Card' : 'Debit Card';
  const providerLabel = provider === 'stripe' ? 'Stripe' : 'Square';
  const modeLabel = paymentMode === 'terminal' ? 'Card Reader' : 'Manual Entry';
  const savedCardsLabel = savedCards.length > 0 ? ` • ${savedCards.length} saved` : '';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{cardIcon}</div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">{cardLabel}</h2>
                <p className="text-gray-600 dark:text-gray-400">Amount: ${total.toFixed(2)}</p>
                <p className="text-sm text-brand-500 font-medium">{providerLabel} • {modeLabel}{savedCardsLabel}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Provider & Mode Selection */}
        <div className="border-b border-stroke dark:border-strokedark p-3">
          <div className="space-y-3">
            {/* Payment Mode Toggle */}
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMode('terminal')}
                  className={`py-1.5 px-2 text-sm rounded-lg font-medium transition-colors ${
                    paymentMode === 'terminal'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  🏪 Reader
                </button>
                <button
                  onClick={() => setPaymentMode('manual')}
                  className={`py-1.5 px-2 text-sm rounded-lg font-medium transition-colors ${
                    paymentMode === 'manual'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  📞 Manual
                </button>
              </div>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-medium text-black dark:text-white mb-2">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setProvider('square')}
                  className={`py-1.5 px-2 text-sm rounded-lg font-medium transition-colors ${
                    provider === 'square'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Square
                </button>
                <button
                  onClick={() => setProvider('stripe')}
                  className={`py-1.5 px-2 text-sm rounded-lg font-medium transition-colors ${
                    provider === 'stripe'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Stripe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Cards Section - Show for both providers in manual entry */}
        {paymentMode === 'manual' && showSavedCards && savedCards.length > 0 && (
          <div className="border-b border-stroke dark:border-strokedark p-4">
            <h3 className="text-sm font-medium text-black dark:text-white mb-3">Saved Payment Methods</h3>
            <div className="space-y-2">
              {savedCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedSavedCard(selectedSavedCard === card.id ? null : card.id)}
                  className={`w-full p-3 border rounded-xl text-left transition-colors ${
                    selectedSavedCard === card.id
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-stroke dark:border-strokedark hover:border-brand-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-lg">
                        {card.type === 'visa' ? '💳' : card.type === 'mastercard' ? '💳' : '💳'}
                      </div>
                      <div>
                        <div className="font-medium text-black dark:text-white">
                          •••• •••• •••• {card.last4}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {card.type.toUpperCase()} expires {card.expMonth.toString().padStart(2, '0')}/{card.expYear.toString().slice(-2)}
                        </div>
                      </div>
                    </div>
                    {selectedSavedCard === card.id && (
                      <div className="text-brand-500">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {selectedSavedCard && (
              <button
                onClick={handleSavedCardPayment}
                disabled={isProcessing}
                className="w-full mt-3 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)} with saved card`}
              </button>
            )}
            
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowSavedCards(false)}
                className="text-sm text-brand-500 hover:text-brand-600"
              >
                Use a different card
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {paymentMode === 'terminal' ? (
            /* Terminal Processing */
            <div className="text-center space-y-4">
              <div className="text-4xl animate-pulse">
                {provider === 'stripe' ? '🟢' : '🔸'}
              </div>
              
              {isProcessing ? (
                <div>
                  <div className="text-lg font-semibold text-black dark:text-white mb-2">
                    Processing Payment...
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Please follow prompts on {provider} card reader
                  </div>
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-semibold text-black dark:text-white mb-2">
                    {provider === 'stripe' ? 'Stripe' : 'Square'} Card Reader
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 mb-6">
                    Insert, tap, or swipe card when ready
                  </div>
                  
                  <button
                    onClick={handleTerminalPayment}
                    className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors mb-4"
                  >
                    Start {provider === 'stripe' ? 'Stripe' : 'Square'} Processing
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual Entry Form - Only show if not using saved cards */
            <div>
              {provider === 'stripe' && !showSavedCards ? (
                /* Stripe Elements Form */
                <div>
                  <h3 className="font-semibold text-black dark:text-white mb-4">Enter Card Details (Stripe)</h3>
                  {clientSecret ? (
                    <Elements stripe={stripeService.getStripe()} options={{ clientSecret }}>
                      <StripePaymentForm
                        onComplete={handleStripePaymentComplete}
                        onCancel={onCancel}
                      />
                    </Elements>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Initializing Stripe...</p>
                    </div>
                  )}
                </div>
              ) : showSavedCards && savedCards.length > 0 ? (
                /* Show message when saved cards are displayed for any provider */
                <div className="text-center py-8">
                  <div className="text-gray-600 dark:text-gray-400">
                    Select a saved payment method above or click "Use a different card"
                  </div>
                </div>
              ) : (
                /* Square Manual Entry Form */
                <div>
                  <h3 className="font-semibold text-black dark:text-white mb-4">Enter Card Details (Square)</h3>
                  <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400">✅ Square Sandbox (test mode)</p>
                  </div>
                  <SquareManualEntryForm
                    total={total}
                    orderIds={orderIds}
                    customerEmail={customerEmail}
                    customerPhone={customerPhone}
                    customerName={customerName}
                    onComplete={handleStripePaymentComplete}
                    onCancel={onCancel}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Only show for terminal mode (manual entry forms have their own buttons) */}
        {paymentMode === 'terminal' && (
          <div className="border-t border-stroke dark:border-strokedark p-6">
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
