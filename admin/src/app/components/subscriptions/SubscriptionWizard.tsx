import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useApiClient } from '@shared/hooks/useApiClient';
import CustomerStep from './steps/CustomerStep';
import RecipientStep from './steps/RecipientStep';
import ScheduleStep from './steps/ScheduleStep';
import BillingStep from './steps/BillingStep';
import ProductStep from './steps/ProductStep';
import ReviewStep from './steps/ReviewStep';
import CardPaymentModal from '../pos/payment/CardPaymentModal';
import { formatCurrency } from '@shared/utils/currency';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface Props {
  onComplete?: (subscription: any) => void;
  compact?: boolean;
  onClose?: () => void;
}

const STEPS = ['Customer', 'Recipient', 'Schedule', 'Billing', 'Products', 'Review'];

export default function SubscriptionWizard({ onComplete, compact, onClose }: Props) {
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Customer
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Step 2: Recipient
  const [recipient, setRecipient] = useState({
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    recipientAddress: '',
    recipientCity: '',
    recipientProvince: 'BC',
    recipientPostalCode: '',
  });

  // Step 3: Schedule
  const [schedule, setSchedule] = useState({
    frequency: 'BIWEEKLY' as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM',
    preferredDayOfWeek: 1 as number | null,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customDates: [] as string[],
  });

  // Step 4: Billing
  const [billing, setBilling] = useState({
    billingType: 'RECURRING' as 'RECURRING' | 'PREPAID',
    totalDeliveries: null as number | null,
    stripePaymentMethodId: null as string | null,
    stripeCustomerId: null as string | null,
  });

  // Step 5: Products
  const [productData, setProductData] = useState({
    style: 'DESIGNERS_CHOICE' as 'DESIGNERS_CHOICE' | 'PICK_YOUR_OWN',
    planId: null as string | null,
    colorPalette: null as string | null,
    defaultPriceCents: 5500,
    selectedProductId: null as string | null,
    deliveryProducts: [] as { scheduledDate: string; productId: string | null; productName: string | null; priceCents: number }[],
  });

  // Step 6: Review
  const [notes, setNotes] = useState('');

  // Plan name for review
  const [planName, setPlanName] = useState('');

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return customer !== null;
      case 1: return !!(recipient.recipientName && recipient.recipientAddress && recipient.recipientCity && recipient.recipientPostalCode);
      case 2: return !!schedule.startDate;
      case 3: return billing.billingType === 'RECURRING' || (billing.totalDeliveries !== null && billing.totalDeliveries > 0);
      case 4: return productData.style === 'DESIGNERS_CHOICE' ? !!productData.planId : !!productData.selectedProductId || productData.deliveryProducts.length > 0;
      case 5: return true;
      default: return false;
    }
  }, [step, customer, recipient, schedule, billing, productData]);

  // Generate delivery dates for per-delivery product customization
  const getDeliveryDates = (): string[] => {
    const count = billing.totalDeliveries || 6;
    const dates: string[] = [];
    let current = new Date(schedule.startDate);

    if (schedule.preferredDayOfWeek !== null && (schedule.frequency === 'WEEKLY' || schedule.frequency === 'BIWEEKLY')) {
      const diff = (schedule.preferredDayOfWeek - current.getDay() + 7) % 7;
      if (diff > 0) current.setDate(current.getDate() + diff);
    }

    for (let i = 0; i < count; i++) {
      dates.push(current.toISOString().split('T')[0]);
      if (schedule.frequency === 'MONTHLY') {
        current = new Date(current);
        current.setMonth(current.getMonth() + 1);
      } else if (schedule.frequency === 'BIWEEKLY') {
        current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
      } else {
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }
    return dates;
  };

  const getPaymentAmount = (): number => {
    if (billing.billingType === 'PREPAID') {
      if (productData.deliveryProducts.length > 0) {
        return productData.deliveryProducts.reduce((sum, dp) => sum + dp.priceCents, 0);
      }
      return productData.defaultPriceCents * (billing.totalDeliveries || 0);
    }
    // Recurring — charge first delivery
    return productData.defaultPriceCents;
  };

  const createSubscription = async (paymentData?: {
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
  }) => {
    if (!customer) return;
    setSubmitting(true);
    try {
      const totalPrepaidCents = billing.billingType === 'PREPAID'
        ? (productData.deliveryProducts.length > 0
          ? productData.deliveryProducts.reduce((sum, dp) => sum + dp.priceCents, 0)
          : productData.defaultPriceCents * (billing.totalDeliveries || 0))
        : null;

      const payload = {
        billingType: billing.billingType,
        style: productData.style,
        planId: productData.planId,
        colorPalette: productData.colorPalette,
        defaultPriceCents: productData.defaultPriceCents,
        totalPrepaidCents: totalPrepaidCents,
        totalDeliveries: billing.totalDeliveries,
        frequency: schedule.frequency,
        preferredDayOfWeek: schedule.preferredDayOfWeek,
        customDates: schedule.customDates,
        startDate: schedule.startDate,
        stripeCustomerId: billing.stripeCustomerId,
        stripePaymentMethodId: billing.stripePaymentMethodId,
        customerId: customer.id,
        ...recipient,
        notes: notes || null,
        source: 'POS',
        deliveryProducts: productData.deliveryProducts.length > 0 ? productData.deliveryProducts : undefined,
        paymentIntentId: paymentData?.paymentIntentId,
      };

      const { data } = await apiClient.post('/api/subscriptions', payload);
      toast.success(`Subscription ${data.subscriptionNumber} created`);

      if (onComplete) {
        onComplete(data);
      } else {
        navigate(`/subscriptions/${data.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create subscription:', err);
      toast.error(err?.data?.error || 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentComplete = (paymentData: {
    method: string;
    transactionId?: string;
    paymentIntentId?: string;
    cardLast4?: string;
    cardBrand?: string;
  }) => {
    setShowPayment(false);
    createSubscription({
      paymentIntentId: paymentData.paymentIntentId,
      cardLast4: paymentData.cardLast4,
      cardBrand: paymentData.cardBrand,
    });
  };

  return (
    <div className={compact ? '' : 'max-w-3xl mx-auto'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Subscription</h2>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                i < step
                  ? 'bg-brand-500 text-white cursor-pointer'
                  : i === step
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {i < step ? '\u2713' : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 ${i < step ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {step === 0 && <CustomerStep selectedCustomer={customer} onSelect={setCustomer} />}
        {step === 1 && (
          <RecipientStep
            data={recipient}
            onChange={setRecipient}
            customerName={customer ? `${customer.firstName} ${customer.lastName}` : undefined}
            customerId={customer?.id}
          />
        )}
        {step === 2 && <ScheduleStep data={schedule} onChange={setSchedule} />}
        {step === 3 && <BillingStep data={billing} onChange={setBilling} pricePerDelivery={productData.defaultPriceCents} />}
        {step === 4 && (
          <ProductStep
            data={productData}
            onChange={(d) => {
              setProductData(d);
              // Track plan name for review
              if (d.planId !== productData.planId) {
                apiClient.get('/api/subscriptions/plans/list').then(({ data: plans }) => {
                  const plan = plans?.find((p: any) => p.id === d.planId);
                  if (plan) setPlanName(plan.name);
                });
              }
            }}
            deliveryDates={getDeliveryDates()}
          />
        )}
        {step === 5 && (
          <ReviewStep
            customerName={customer ? `${customer.firstName} ${customer.lastName}` : ''}
            recipientName={recipient.recipientName}
            recipientAddress={recipient.recipientAddress}
            recipientCity={recipient.recipientCity}
            recipientPostalCode={recipient.recipientPostalCode}
            style={productData.style}
            planName={planName}
            colorPalette={productData.colorPalette}
            frequency={schedule.frequency}
            preferredDayOfWeek={schedule.preferredDayOfWeek}
            startDate={schedule.startDate}
            billingType={billing.billingType}
            defaultPriceCents={productData.defaultPriceCents}
            totalDeliveries={billing.totalDeliveries}
            deliveryProducts={productData.deliveryProducts}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => step > 0 ? setStep(step - 1) : (onClose ? onClose() : navigate('/subscriptions'))}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            disabled={submitting}
            className="px-6 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : `Collect Payment (${formatCurrency(getPaymentAmount())})`}
          </button>
        )}
      </div>

      {/* Payment Modal */}
      <CardPaymentModal
        open={showPayment}
        total={getPaymentAmount()}
        cardType="credit"
        bloomCustomerId={customer?.id}
        customerEmail={customer?.email || undefined}
        customerPhone={customer?.phone || undefined}
        customerName={customer ? `${customer.firstName} ${customer.lastName}` : undefined}
        onComplete={handlePaymentComplete}
        onCancel={() => setShowPayment(false)}
      />
    </div>
  );
}
