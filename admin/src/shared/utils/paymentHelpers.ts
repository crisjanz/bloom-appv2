/**
 * Payment Processing Utilities
 *
 * Centralized payment helper functions to replace duplicates in:
 * - PaymentController.tsx
 * - POSUnifiedPaymentModal.tsx (deleted)
 * - PaymentSection.tsx
 */
import { formatCurrency } from '@shared/utils/currency';

/**
 * Map frontend payment method to backend API type
 * @param method - Frontend payment method string
 * @returns Backend payment type enum value
 */
export const mapPaymentMethodType = (method: string): string => {
  const methodMap: Record<string, string> = {
    cash: 'CASH',
    credit: 'CARD',
    debit: 'CARD',
    gift_card: 'GIFT_CARD',
    store_credit: 'STORE_CREDIT',
    check: 'CHECK',
    cod: 'COD',
    house_account: 'HOUSE_ACCOUNT',
  };

  // Handle offline methods
  if (method.startsWith('offline:') || method === 'wire') {
    return 'OFFLINE';
  }

  return methodMap[method] || 'CASH';
};

/**
 * Get payment provider name from method and metadata
 * @param method - Payment method
 * @param providerFromMetadata - Provider from payment metadata (optional)
 * @returns Provider name (STRIPE, SQUARE, or INTERNAL)
 */
export const getPaymentProvider = (method: string, providerFromMetadata?: string): string => {
  if (providerFromMetadata) return providerFromMetadata.toUpperCase();
  if (method === 'credit' || method === 'debit') return 'SQUARE';
  return 'INTERNAL';
};

/**
 * Transform cart items into order format for completion summary
 * @param cartItems - Array of cart items
 * @param customerName - Customer name for the order
 * @returns Array of order objects
 */
export const transformCartToOrders = (cartItems: any[] = [], customerName?: string) => {
  if (!cartItems.length) return [];

  return [
    {
      id: 'pos-order',
      type: 'pos' as const,
      customerName,
      total: cartItems.reduce(
        (sum, item) => sum + (item.unitPrice ?? item.price ?? 0) * (item.quantity ?? 0),
        0,
      ),
    },
  ];
};

/**
 * Generate a human-readable payment summary from payment metadata
 * @param payment - Payment object with method and metadata
 * @returns Summary string or undefined
 */
export const generatePaymentSummary = (payment: { method: string; amount: number; metadata?: Record<string, any> }): string | undefined => {
  if (payment.method === 'cash' && payment.metadata?.cashReceived) {
    const change =
      typeof payment.metadata.changeDue === 'number' && payment.metadata.changeDue > 0
        ? ` • Change ${formatCurrency(payment.metadata.changeDue)}`
        : '';
    return `Cash received ${formatCurrency(payment.metadata.cashReceived)}${change}`;
  }

  if (payment.method === 'credit') {
    const provider = payment.metadata?.provider
      ? payment.metadata.provider.charAt(0).toUpperCase() + payment.metadata.provider.slice(1)
      : 'Card';
    const last4 = payment.metadata?.cardLast4 ? ` • **** ${payment.metadata.cardLast4}` : '';
    return `${provider}${last4}`;
  }

  if (payment.method === 'check' && payment.metadata?.reference) {
    return `Check #${payment.metadata.reference}`;
  }

  if ((payment.method === 'cod' || payment.method === 'house_account') && payment.metadata?.reference) {
    return payment.metadata.reference;
  }

  return undefined;
};

/**
 * Normalize payments to ensure total matches expected amount (handles floating point errors)
 * @param payments - Array of payment entries
 * @param expectedTotal - Expected total amount
 * @param minBalance - Minimum balance threshold (default: 0.01)
 * @returns Normalized payment array
 */
export const normalizePayments = (
  payments: Array<{ method: string; amount: number; metadata?: any }>,
  expectedTotal: number,
  minBalance: number = 1
): Array<{ method: string; amount: number; metadata?: any }> => {
  if (!payments.length) return payments;

  const totalSubmitted = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const difference = expectedTotal - totalSubmitted;

  // If difference is within min balance threshold, adjust the last payment
  if (Math.abs(difference) <= minBalance) {
    const clone = payments.map((payment, index) =>
      index === payments.length - 1
        ? { ...payment, amount: payment.amount + difference }
        : payment,
    );
    return clone;
  }

  return payments;
};

/**
 * Validate if payments cover the total amount
 * @param payments - Array of payment entries
 * @param total - Total amount to be covered
 * @param tolerance - Tolerance for floating point errors (default: 0.01)
 * @returns True if payments cover total
 */
export const paymentsCoverTotal = (
  payments: Array<{ amount: number }>,
  total: number,
  tolerance: number = 1
): boolean => {
  const paymentSum = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.abs(paymentSum - total) <= tolerance;
};

/**
 * Calculate change due for cash payment
 * @param cashReceived - Amount of cash received
 * @param amountDue - Amount due
 * @returns Change due (0 if no change)
 */
export const calculateChange = (cashReceived: number, amountDue: number): number => {
  const change = cashReceived - amountDue;
  return change > 0 ? change : 0;
};
