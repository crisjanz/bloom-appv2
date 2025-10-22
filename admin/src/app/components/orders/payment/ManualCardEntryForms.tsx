import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import stripeService from '@shared/legacy-services/stripeService';

export type CardSubmissionResult = {
  success: boolean;
  result?: {
    method: string;
    provider: 'stripe' | 'square';
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
  };
};

export interface ManualCardFormHandle {
  submit: () => Promise<CardSubmissionResult>;
}

type ManualCardEntryBaseProps = {
  amount: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  onProcessingChange: (processing: boolean) => void;
  onError: (message: string | null) => void;
  onReadyChange: (ready: boolean) => void;
};

type StripeManualEntryProps = ManualCardEntryBaseProps & {
  provider: 'stripe';
};

type SquareManualEntryProps = ManualCardEntryBaseProps & {
  provider: 'square';
};

type ManualCardEntryProps = StripeManualEntryProps | SquareManualEntryProps;

type StripeSubmitHandler = () => Promise<CardSubmissionResult>;

type StripeManualEntryFormProps = {
  registerSubmit: (handler: StripeSubmitHandler) => void;
  onProcessingChange: (processing: boolean) => void;
  onError: (message: string | null) => void;
  setLocalError: (message: string | null) => void;
};

const StripeManualEntryForm = ({
  registerSubmit,
  onProcessingChange,
  onError,
  setLocalError,
}: StripeManualEntryFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const submit = useCallback(async (): Promise<CardSubmissionResult> => {
    if (!stripe || !elements) {
      const message = 'Stripe is still loading. Please wait a moment.';
      setLocalError(message);
      onError(message);
      return { success: false };
    }

    onProcessingChange(true);
    setLocalError(null);
    onError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: 'if_required',
      });

      if (error) {
        const message = error.message || 'Payment failed.';
        setLocalError(message);
        onError(message);
        return { success: false };
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        return {
          success: true,
          result: {
            method: 'credit_stripe',
            provider: 'stripe',
            transactionId: paymentIntent.id,
            paymentIntentId: paymentIntent.id,
          },
        };
      }

      const message = 'Payment not completed. Please try again.';
      setLocalError(message);
      onError(message);
      return { success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed.';
      setLocalError(message);
      onError(message);
      return { success: false };
    } finally {
      onProcessingChange(false);
    }
  }, [stripe, elements, onProcessingChange, onError, setLocalError]);

  useEffect(() => {
    registerSubmit(submit);
  }, [registerSubmit, submit]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
    </form>
  );
};

const StripeManualEntry = forwardRef<ManualCardFormHandle, StripeManualEntryProps>(
  (
    {
      amount,
      customerEmail,
      customerPhone,
      customerName,
      onProcessingChange,
      onError,
      onReadyChange,
    },
    ref
  ) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [initializing, setInitializing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const submitRef = useRef<StripeSubmitHandler>(() => Promise.resolve({ success: false }));

    useImperativeHandle(
      ref,
      () => ({
        submit: () => submitRef.current(),
      }),
      []
    );

    useEffect(() => {
      let cancelled = false;

      const initialize = async () => {
        if (!Number.isFinite(amount) || amount <= 0) {
          setClientSecret(null);
          setLocalError(null);
          onReadyChange(false);
          return;
        }

        setInitializing(true);
        onReadyChange(false);
        try {
          const response = await stripeService.createPaymentIntent({
            amount,
            currency: 'cad',
            customerEmail: customerEmail ?? undefined,
            customerPhone: customerPhone ?? undefined,
            customerName: customerName ?? undefined,
          });

          if (cancelled) return;

          setClientSecret(response.clientSecret);
          setLocalError(null);
          onError(null);
          onReadyChange(true);
        } catch (error) {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : 'Failed to initialize Stripe.';
          setClientSecret(null);
          setLocalError(message);
          onError(message);
          onReadyChange(false);
        } finally {
          if (!cancelled) {
            setInitializing(false);
          }
        }
      };

      void initialize();

      return () => {
        cancelled = true;
      };
    }, [amount, customerEmail, customerPhone, customerName, onError, onReadyChange]);

    return (
      <div className="space-y-4">
        {initializing && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">
            Initializing Stripe…
          </div>
        )}

        {!initializing && clientSecret && (
          <Elements
            stripe={stripeService.getStripe()}
            options={stripeService.getElementsOptions(clientSecret)}
            key={clientSecret}
          >
            <StripeManualEntryForm
              registerSubmit={(handler) => {
                submitRef.current = handler;
              }}
              onProcessingChange={onProcessingChange}
              onError={onError}
              setLocalError={setLocalError}
            />
          </Elements>
        )}

        {!initializing && !clientSecret && (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">
            Enter an amount to initialize Stripe manual entry.
          </div>
        )}

        {localError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {localError}
          </div>
        )}
      </div>
    );
  }
);

const formatCardNumber = (value: string) => {
  const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.substring(i, i + 4));
  }
  return parts.join(' ').trim();
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
};

const SquareManualEntry = forwardRef<ManualCardFormHandle, SquareManualEntryProps>(
  (
    {
      amount,
      customerEmail,
      customerPhone,
      customerName,
      onProcessingChange,
      onError,
      onReadyChange,
    },
    ref
  ) => {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
      onReadyChange(true);
    }, [onReadyChange]);

    useImperativeHandle(
      ref,
      () => ({
        submit: async () => {
          if (!Number.isFinite(amount) || amount <= 0) {
            const message = 'Enter a valid amount before processing.';
            setLocalError(message);
            onError(message);
            return { success: false };
          }

          if (!cardNumber || !expiry || !cvv) {
            const message = 'Please fill in card number, expiry, and CVV.';
            setLocalError(message);
            onError(message);
            return { success: false };
          }

          onProcessingChange(true);
          setLocalError(null);
          onError(null);

          try {
            const response = await fetch('http://localhost:4000/api/square/payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount,
                currency: 'CAD',
                sourceId: `cnon:card-nonce-ok-${Date.now()}`,
                customerEmail: customerEmail ?? undefined,
                customerPhone: customerPhone ?? undefined,
                customerName: customerName ?? undefined,
                description: 'Bloom TakeOrder payment',
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              const message = errorData.error || 'Payment failed.';
              setLocalError(message);
              onError(message);
              return { success: false };
            }

            const result = await response.json();

            return {
              success: true,
              result: {
                method: 'credit_square_manual',
                provider: 'square',
                transactionId: result.paymentId,
                cardLast4: cardNumber.slice(-4),
              },
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Payment failed.';
            setLocalError(message);
            onError(message);
            return { success: false };
          } finally {
            onProcessingChange(false);
          }
        },
      }),
      [amount, cardNumber, cvv, customerEmail, customerName, customerPhone, expiry, onError, onProcessingChange]
    );

    return (
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
            Card Number
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className="w-full rounded-xl border border-stroke px-4 py-3 text-sm text-gray-700 shadow-none outline-none transition focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 dark:border-strokedark dark:bg-boxdark dark:text-gray-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Expiry
            </label>
            <input
              type="text"
              value={expiry}
              onChange={(event) => setExpiry(formatExpiry(event.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              className="w-full rounded-xl border border-stroke px-4 py-3 text-sm text-gray-700 shadow-none outline-none transition focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 dark:border-strokedark dark:bg-boxdark dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              CVV
            </label>
            <input
              type="text"
              value={cvv}
              onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              maxLength={4}
              className="w-full rounded-xl border border-stroke px-4 py-3 text-sm text-gray-700 shadow-none outline-none transition focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 dark:border-strokedark dark:bg-boxdark dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
            Postal Code
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value.toUpperCase())}
            placeholder="K1A 0A6"
            className="w-full rounded-xl border border-stroke px-4 py-3 text-sm text-gray-700 shadow-none outline-none transition focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 dark:border-strokedark dark:bg-boxdark dark:text-gray-100"
          />
        </div>

        {localError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {localError}
          </div>
        )}
      </div>
    );
  }
);

const ManualCardEntry = forwardRef<ManualCardFormHandle, ManualCardEntryProps>((props, ref) => {
  if (props.provider === 'stripe') {
    return <StripeManualEntry {...props} ref={ref} />;
  }

  return <SquareManualEntry {...props} ref={ref} />;
});

export default ManualCardEntry;
