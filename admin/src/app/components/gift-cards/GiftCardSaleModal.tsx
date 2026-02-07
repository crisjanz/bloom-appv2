import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import Label from '@shared/ui/forms/Label';
import Checkbox from '@shared/ui/forms/input/Checkbox';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import FormError from '@shared/ui/components/ui/form/FormError';
import { PlusIcon } from '@shared/assets/icons';
import { useApiClient } from '@shared/hooks/useApiClient';
import { centsToDollars, formatCurrency, parseUserCurrency } from '@shared/utils/currency';
import {
  GiftCardSaleData,
  normalizeGiftCardNumber,
  validateGiftCardAmount,
} from '@shared/utils/giftCardHelpers';

type GiftCardSaleMode = 'physical' | 'electronic';

type Props = {
  open: boolean;
  mode: GiftCardSaleMode;
  initialCardNumber?: string;
  defaultAmountCents?: number | null;
  onClose: () => void;
  onAdd: (payload: GiftCardSaleData) => void;
};

const presetAmounts = [2500, 5000, 10000];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function GiftCardSaleModal({
  open,
  mode,
  initialCardNumber,
  defaultAmountCents,
  onClose,
  onAdd,
}: Props) {
  const apiClient = useApiClient();
  const [cardNumber, setCardNumber] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cardStatusError, setCardStatusError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const emailLocked = mode === 'electronic';
  const showEmailFields = sendEmail || emailLocked;

  const selectedPreset = useMemo(
    () => (selectedAmount ? presetAmounts.find((value) => value === selectedAmount) : null),
    [selectedAmount],
  );

  const resetState = useCallback(() => {
    setError(null);
    setCardStatusError(null);
    setRecipientEmail('');
    setRecipientName('');
    setMessage('');
    setCustomAmount('');
    setSelectedAmount(defaultAmountCents ?? null);
    setSendEmail(mode === 'electronic');
  }, [defaultAmountCents, mode]);

  const generateElectronicNumber = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data, status } = await apiClient.post('/api/gift-cards/generate-number', {});
      if (status >= 400) {
        throw new Error(data?.error || 'Failed to generate gift card number');
      }
      setCardNumber(normalizeGiftCardNumber(data?.cardNumber || ''));
    } catch (err) {
      console.error('Failed to generate gift card number:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate gift card number');
      setCardNumber('');
    } finally {
      setIsGenerating(false);
    }
  }, [apiClient]);

  const validatePhysicalNumber = useCallback(
    async (value: string) => {
      if (!value) return;
      setIsValidating(true);
      setCardStatusError(null);
      try {
        const { data, status } = await apiClient.post('/api/gift-cards/check', {
          cardNumber: value,
        });

        if (status === 200) {
          setCardStatusError('This gift card is already active.');
          return;
        }

        const messageText = typeof data?.error === 'string' ? data.error : '';
        if (status === 400 && messageText.toLowerCase().includes('not been activated')) {
          setCardStatusError(null);
          return;
        }

        if (status >= 400) {
          setCardStatusError(messageText || 'Unable to validate this gift card.');
        }
      } catch (err: any) {
        const fallback = err?.response?.data?.error || err?.message || 'Unable to validate this gift card.';
        setCardStatusError(fallback);
      } finally {
        setIsValidating(false);
      }
    },
    [apiClient],
  );

  useEffect(() => {
    if (!open) return;
    resetState();
    const normalized = initialCardNumber ? normalizeGiftCardNumber(initialCardNumber) : '';
    if (mode === 'physical') {
      setCardNumber(normalized);
      if (normalized) {
        void validatePhysicalNumber(normalized);
      }
    } else {
      setCardNumber('');
      void generateElectronicNumber();
    }
  }, [open, mode, initialCardNumber, generateElectronicNumber, resetState, validatePhysicalNumber]);

  useEffect(() => {
    if (!open) return;
    if (defaultAmountCents && !presetAmounts.includes(defaultAmountCents)) {
      setCustomAmount(centsToDollars(defaultAmountCents).toFixed(2));
    }
  }, [defaultAmountCents, open]);

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const cents = parseUserCurrency(value);
    setSelectedAmount(cents > 0 ? cents : null);
  };

  const handleSubmit = () => {
    setError(null);
    if (!cardNumber) {
      setError('Card number is required.');
      return;
    }

    if (cardStatusError) {
      setError(cardStatusError);
      return;
    }

    if (!selectedAmount || selectedAmount <= 0) {
      setError('Select a gift card amount.');
      return;
    }

    const validation = validateGiftCardAmount(selectedAmount / 100);
    if (!validation.valid) {
      setError(validation.error || 'Invalid gift card amount.');
      return;
    }

    if (showEmailFields) {
      const emailValue = recipientEmail.trim();
      if (!emailValue) {
        setError('Recipient email is required.');
        return;
      }
      if (!isValidEmail(emailValue)) {
        setError('Enter a valid recipient email.');
        return;
      }
    }

    onAdd({
      cardNumber: normalizeGiftCardNumber(cardNumber),
      amount: selectedAmount,
      type: mode === 'electronic' ? 'DIGITAL' : 'PHYSICAL',
      recipientEmail: showEmailFields ? recipientEmail.trim() : undefined,
      recipientName: recipientName.trim() || undefined,
      message: message.trim() || undefined,
    });
    onClose();
  };

  const amountLabel = selectedAmount ? formatCurrency(selectedAmount) : '$0.00';

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-2xl">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sell Gift Card</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'physical'
              ? 'Scan a physical card and choose the amount.'
              : 'Create a digital gift card and email it to the recipient.'}
          </p>
        </div>

        {error && <FormError error={error} />}
        {!error && cardStatusError && <FormError error={cardStatusError} />}

        <InputField
          label="Card Number"
          value={cardNumber || ''}
          onChange={() => {}}
          readOnly
          disabled={isGenerating}
          className="font-mono"
          hint={isGenerating ? 'Generating card number...' : undefined}
        />

        <div className="space-y-3">
          <Label>Amount</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handlePresetClick(amount)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedPreset === amount
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-500'
                }`}
              >
                {formatCurrency(amount)}
              </button>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <InputField
                label="Custom"
                type="text"
                placeholder="0.00"
                value={customAmount || ''}
                onChange={(event) => handleCustomAmountChange(event.target.value)}
              />
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Selected amount: {amountLabel}
          </div>
        </div>

        <div className="rounded-lg border border-stroke dark:border-strokedark p-3">
          <Checkbox
            checked={emailLocked || sendEmail}
            onChange={(checked) => setSendEmail(checked)}
            disabled={emailLocked}
            label="Send digital copy via email"
          />
        </div>

        {showEmailFields && (
          <div className="space-y-4 rounded-lg border border-stroke dark:border-strokedark p-4">
            <InputField
              label="Recipient Email"
              type="email"
              value={recipientEmail || ''}
              onChange={(event) => setRecipientEmail(event.target.value)}
              required
            />
            <InputField
              label="Recipient Name"
              type="text"
              value={recipientName || ''}
              onChange={(event) => setRecipientName(event.target.value)}
            />
            <div>
              <Label>Message</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                rows={3}
                value={message || ''}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
          </div>
        )}

        <FormFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitting={false}
          submitDisabled={isGenerating || isValidating || Boolean(cardStatusError)}
          submitText={isGenerating ? 'Preparing...' : 'Add to Cart'}
          submitIcon={<PlusIcon className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}
