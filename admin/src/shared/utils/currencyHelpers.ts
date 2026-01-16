/**
 * Currency Formatting Utilities (Deprecated)
 *
 * Use @shared/utils/currency instead.
 * Rule: all values are in cents (integers).
 */

import {
  formatCurrency as formatCurrencyCents,
  parseUserCurrency,
  centsToDollars,
  dollarsToCents,
} from './currency';

/**
 * Format cents (integer) as currency.
 */
export const formatCurrency = (cents: number): string => {
  return formatCurrencyCents(cents);
};

/**
 * Parse a currency string to cents.
 */
export const parseCurrency = (value: string): number => {
  return parseUserCurrency(value);
};

/**
 * Alias for formatCurrency (cents).
 */
export const formatCents = (cents: number): string => {
  return formatCurrencyCents(cents);
};

/**
 * Convert dollars to cents.
 */
export { dollarsToCents };

/**
 * Convert cents to dollars.
 */
export { centsToDollars };

/**
 * Format currency with optional currency code.
 */
export const formatCurrencyWithCode = (cents: number, currencyCode: string = 'CAD'): string => {
  return `${formatCurrencyCents(cents)} ${currencyCode}`;
};

/**
 * Safely add two currency values in cents.
 */
export const addCurrency = (a: number, b: number): number => {
  return Math.round((a || 0) + (b || 0));
};

/**
 * Safely subtract two currency values in cents.
 */
export const subtractCurrency = (a: number, b: number): number => {
  return Math.round((a || 0) - (b || 0));
};

/**
 * Safely multiply currency value in cents.
 */
export const multiplyCurrency = (value: number, multiplier: number): number => {
  return Math.round((value || 0) * (multiplier || 0));
};
