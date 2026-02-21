import { useRef, useState } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import {
  CreditCardIcon,
  DollarSignIcon,
  HomeIcon,
  ClockIcon,
  EnvelopeIcon,
  FileIcon,
} from '@shared/assets/icons';
import { centsToDollars, dollarsToCents, formatCurrency, parseUserCurrency } from '@shared/utils/currency';
import InputField from '@shared/ui/forms/input/InputField';
import { useApiClient } from '@shared/hooks/useApiClient';
import CardPaymentModal from '@app/components/pos/payment/CardPaymentModal';
import { toast } from 'sonner';

type View = 'methods' | 'cash' | 'card' | 'etransfer' | 'cheque' | 'house_account' | 'pay_later';

interface CollectPaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number; // balance due in cents
  orderId: string;
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  employeeId?: string;
  onSuccess: () => void;
}

const VIEW_TITLES: Record<View, string> = {
  methods: 'Collect Payment',
  cash: 'Cash Payment',
  card: 'Card Payment',
  etransfer: 'E-Transfer',
  cheque: 'Cheque Payment',
  house_account: 'House Account',
  pay_later: 'Pay Later',
};

const METHODS: { id: View; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'cash', label: 'Cash', Icon: DollarSignIcon },
  { id: 'card', label: 'Card', Icon: CreditCardIcon },
  { id: 'etransfer', label: 'E-Transfer', Icon: EnvelopeIcon },
  { id: 'house_account', label: 'House Account', Icon: HomeIcon },
  { id: 'pay_later', label: 'Pay Later', Icon: ClockIcon },
  { id: 'cheque', label: 'Cheque', Icon: FileIcon },
];

export default function CollectPaymentModal({
  open,
  onClose,
  amount,
  orderId,
  customerId,
  customerEmail,
  customerPhone,
  customerName,
  employeeId,
  onSuccess,
}: CollectPaymentModalProps) {
  const apiClient = useApiClient();
  const [view, setView] = useState<View>('methods');
  const [animating, setAnimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const paymentAttemptIdempotencyKey = useRef<string | null>(null);

  const navigate = (next: View) => {
    setAnimating(true);
    setTimeout(() => { setView(next); setAnimating(false); }, 150);
  };

  const goBack = () => navigate('methods');

  const handleClose = () => {
    setView('methods');
    setAnimating(false);
    paymentAttemptIdempotencyKey.current = null;
    onClose();
  };

  const recordPayment = async (paymentMethods: any[]) => {
    if (!paymentAttemptIdempotencyKey.current) {
      paymentAttemptIdempotencyKey.current = crypto.randomUUID();
    }

    setSubmitting(true);
    try {
      await apiClient.post('/api/payment-transactions', {
        customerId,
        employeeId,
        channel: 'POS',
        totalAmount: amount,
        taxAmount: 0,
        tipAmount: 0,
        paymentMethods,
        orderIds: [orderId],
        idempotencyKey: paymentAttemptIdempotencyKey.current,
      });
      toast.success('Payment recorded');
      paymentAttemptIdempotencyKey.current = null;
      handleClose();
      onSuccess();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCash = (data: { cashReceived: number; changeDue: number }) => {
    recordPayment([{
      type: 'CASH',
      provider: 'INTERNAL',
      amount,
      providerMetadata: {
        cashReceived: data.cashReceived,
        changeDue: data.changeDue,
      },
    }]);
  };

  const handleManual = (methodType: string, data: { amount: number; reference?: string }) => {
    const normalizedType = methodType === 'ETRANSFER' ? 'OFFLINE' : methodType;
    recordPayment([{
      type: normalizedType,
      provider: 'INTERNAL',
      amount: data.amount,
      providerMetadata: {
        reference: data.reference,
        sourceType: methodType,
      },
    }]);
  };

  const handleCard = (paymentData: any) => {
    recordPayment([{
      type: 'CARD',
      provider: 'STRIPE',
      amount,
      providerTransactionId: paymentData.transactionId,
      providerMetadata: paymentData.paymentIntentId
        ? { paymentIntentId: paymentData.paymentIntentId }
        : undefined,
      cardLast4: paymentData.cardLast4,
      cardBrand: paymentData.cardBrand,
    }]);
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="max-w-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {view !== 'methods' && (
            <button
              onClick={goBack}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {VIEW_TITLES[view]}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Amount due: {formatCurrency(amount)}
            </p>
          </div>
        </div>

        {/* Content with fade */}
        <div className={`transition-opacity duration-150 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {view === 'methods' && <MethodSelector onSelect={navigate} />}

          {view === 'cash' && (
            <CashPanel
              total={amount}
              onComplete={handleCash}
              onBack={goBack}
              submitting={submitting}
            />
          )}

          {view === 'card' && (
            <CardPaymentModal
              embedded
              open={true}
              total={amount}
              cardType="credit"
              orderIds={[orderId]}
              bloomCustomerId={customerId}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              customerName={customerName}
              onComplete={handleCard}
              onCancel={goBack}
            />
          )}

          {view === 'etransfer' && (
            <ManualPanel
              total={amount}
              methodLabel="E-Transfer"
              requireReference
              referenceLabel="Transfer Reference"
              onComplete={(data) => handleManual('ETRANSFER', data)}
              onBack={goBack}
              submitting={submitting}
            />
          )}

          {view === 'cheque' && (
            <ManualPanel
              total={amount}
              methodLabel="Cheque"
              requireReference
              referenceLabel="Cheque Number"
              onComplete={(data) => handleManual('CHECK', data)}
              onBack={goBack}
              submitting={submitting}
            />
          )}

          {view === 'house_account' && (
            <ManualPanel
              total={amount}
              methodLabel="House Account"
              referenceLabel="Note"
              onComplete={(data) => handleManual('HOUSE_ACCOUNT', data)}
              onBack={goBack}
              submitting={submitting}
            />
          )}

          {view === 'pay_later' && (
            <ManualPanel
              total={amount}
              methodLabel="Pay Later"
              referenceLabel="Note"
              onComplete={(data) => handleManual('PAY_LATER', data)}
              onBack={goBack}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function MethodSelector({ onSelect }: { onSelect: (view: View) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {METHODS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
        >
          <Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </button>
      ))}
    </div>
  );
}

function CashPanel({
  total,
  onComplete,
  onBack,
  submitting,
}: {
  total: number;
  onComplete: (data: { cashReceived: number; changeDue: number }) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [cashReceived, setCashReceived] = useState(centsToDollars(total).toFixed(2));
  const [error, setError] = useState('');

  const cashAmount = parseUserCurrency(cashReceived);
  const changeDue = Math.max(0, cashAmount - total);
  const isValid = cashAmount >= total;

  const handleComplete = () => {
    if (!isValid) {
      setError('Cash received must be at least the total amount');
      return;
    }
    onComplete({ cashReceived: cashAmount, changeDue });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cash Received
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg">$</span>
          <input
            type="number"
            value={cashReceived}
            onChange={(e) => { setCashReceived(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleComplete()}
            className="w-full pl-10 pr-4 py-4 text-xl font-semibold border border-gray-300 dark:border-gray-700 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-gray-900 text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min="0"
            step="0.01"
            autoFocus
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Change Due:</span>
          <span className={`text-2xl font-bold ${changeDue > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(changeDue)}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Amounts:</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            Math.ceil(centsToDollars(total)),
            Math.ceil(centsToDollars(total) / 5) * 5,
            Math.ceil(centsToDollars(total) / 10) * 10,
            Math.ceil(centsToDollars(total) / 20) * 20,
          ].map((amt) => (
            <button
              key={amt}
              onClick={() => setCashReceived(amt.toFixed(2))}
              className="py-2 px-3 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
            >
              {formatCurrency(dollarsToCents(amt))}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={!isValid || submitting}
          className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          {submitting ? 'Processing...' : 'Complete Payment'}
        </button>
      </div>
    </div>
  );
}

function ManualPanel({
  total,
  methodLabel,
  requireReference = false,
  referenceLabel = 'Reference',
  onComplete,
  onBack,
  submitting,
}: {
  total: number;
  methodLabel: string;
  requireReference?: boolean;
  referenceLabel?: string;
  onComplete: (data: { amount: number; reference?: string }) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (requireReference && !reference.trim()) {
      setError(`Enter a ${referenceLabel.toLowerCase()}.`);
      return;
    }
    setError('');
    onComplete({ amount: total, reference: reference.trim() || undefined });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
        <div className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium">
          {formatCurrency(total)}
        </div>
      </div>

      <InputField
        label={requireReference ? referenceLabel : `${referenceLabel} (optional)`}
        value={reference}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setReference(e.target.value); setError(''); }}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          {submitting ? 'Processing...' : `Confirm ${methodLabel}`}
        </button>
      </div>
    </div>
  );
}
