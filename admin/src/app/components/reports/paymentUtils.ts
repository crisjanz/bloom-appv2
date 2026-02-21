import { SalesOrderPaymentMethod } from '@domains/reports/types';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CARD: 'Card',
  CASH: 'Cash',
  GIFT_CARD: 'Gift Card',
  STORE_CREDIT: 'Store Credit',
  CHECK: 'Cheque',
  PAY_LATER: 'Pay Later',
  COD: 'Pay Later',
  UNPAID: 'No Payments',
  UNKNOWN: 'Unknown'
};

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  STRIPE: 'Stripe',
  SQUARE: 'Square',
  INTERNAL: 'In-House',
  UNKNOWN: 'Unknown'
};

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const createPaymentMethodKey = (type?: string | null, provider?: string | null) => {
  const normalizedType = (type || 'UNKNOWN').toUpperCase();
  const normalizedProvider = (provider || '').toUpperCase();

  if (!normalizedProvider || normalizedProvider === 'INTERNAL') {
    return normalizedType;
  }

  return `${normalizedType}__${normalizedProvider}`;
};

export const splitPaymentMethodKey = (key?: string | null) => {
  if (!key) {
    return { type: 'UNKNOWN', provider: null as string | null };
  }

  const [rawType, rawProvider] = key.split('__');
  const type = (rawType || 'UNKNOWN').toUpperCase();
  const provider = rawProvider ? rawProvider.toUpperCase() : null;

  return { type, provider };
};

export const formatPaymentMethodKeyLabel = (key?: string | null) => {
  const { type, provider } = splitPaymentMethodKey(key);

  if (type === 'UNPAID') {
    return PAYMENT_TYPE_LABELS.UNPAID;
  }

  const baseLabel =
    PAYMENT_TYPE_LABELS[type] ?? toTitleCase(type.replace(/_/g, ' '));

  if (!provider || provider === 'INTERNAL') {
    return baseLabel;
  }

  const providerLabel =
    PAYMENT_PROVIDER_LABELS[provider] ?? toTitleCase(provider.replace(/_/g, ' '));

  return `${baseLabel} (${providerLabel})`;
};

export const summarizePaymentMethods = (
  methods?: SalesOrderPaymentMethod[],
  fallback = PAYMENT_TYPE_LABELS.UNPAID
) => {
  if (!methods || methods.length === 0) {
    return fallback;
  }

  return methods
    .map((method) => method.displayName || formatPaymentMethodKeyLabel(method.key))
    .join(', ');
};

export const DEFAULT_PAYMENT_METHOD_KEYS = [
  createPaymentMethodKey('CARD', 'STRIPE'),
  createPaymentMethodKey('CARD', 'SQUARE'),
  createPaymentMethodKey('CASH'),
  createPaymentMethodKey('GIFT_CARD'),
  createPaymentMethodKey('STORE_CREDIT'),
  createPaymentMethodKey('CHECK'),
  createPaymentMethodKey('PAY_LATER'),
  createPaymentMethodKey('UNPAID')
];
