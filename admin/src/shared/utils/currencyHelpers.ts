/**
 * Currency Formatting Utilities
 *
 * Centralized currency formatting functions to replace duplicates across:
 * - PaymentController.tsx
 * - POSUnifiedPaymentModal.tsx (deleted)
 * - OrdersListPage.tsx
 * - TransactionsReportPage.tsx
 * - And 13+ other files
 */

/**
 * Format a number as currency (CAD)
 * @param value - The numeric value to format
 * @returns Formatted string like "$123.45"
 */
export const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`;
};

/**
 * Parse a currency string to a number
 * @param value - Currency string like "$123.45" or "123.45"
 * @returns Parsed number or 0 if invalid
 */
export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format cents (integer) as currency
 * @param cents - Value in cents (e.g., 12345 = $123.45)
 * @returns Formatted string like "$123.45"
 */
export const formatCents = (cents: number): string => {
  return formatCurrency(cents / 100);
};

/**
 * Convert dollars to cents
 * @param dollars - Value in dollars
 * @returns Value in cents (integer)
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 * @param cents - Value in cents
 * @returns Value in dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

/**
 * Format currency with optional currency code
 * @param value - The numeric value
 * @param currencyCode - Currency code (default: 'CAD')
 * @returns Formatted string like "$123.45 CAD"
 */
export const formatCurrencyWithCode = (value: number, currencyCode: string = 'CAD'): string => {
  return `${formatCurrency(value)} ${currencyCode}`;
};

/**
 * Safely add two currency values (avoids floating point errors)
 * @param a - First value
 * @param b - Second value
 * @returns Sum rounded to 2 decimals
 */
export const addCurrency = (a: number, b: number): number => {
  return Number((a + b).toFixed(2));
};

/**
 * Safely subtract two currency values (avoids floating point errors)
 * @param a - Value to subtract from
 * @param b - Value to subtract
 * @returns Difference rounded to 2 decimals
 */
export const subtractCurrency = (a: number, b: number): number => {
  return Number((a - b).toFixed(2));
};

/**
 * Safely multiply currency value (avoids floating point errors)
 * @param value - Base value
 * @param multiplier - Multiplier
 * @returns Product rounded to 2 decimals
 */
export const multiplyCurrency = (value: number, multiplier: number): number => {
  return Number((value * multiplier).toFixed(2));
};
