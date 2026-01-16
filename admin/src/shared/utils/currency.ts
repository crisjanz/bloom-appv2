/**
 * Currency utilities - single source of truth for money handling.
 *
 * Rule: store all monetary values in cents (integers).
 * Only convert to dollars for display via formatCurrency().
 */

export type Cents = number & { readonly __brand: 'Cents' };
export type Dollars = string;

export const formatCurrency = (cents: number): Dollars => {
  return `$${(cents / 100).toFixed(2)}`;
};

export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

export const dollarsToCents = (dollars: string | number): number => {
  const raw =
    typeof dollars === 'string'
      ? parseFloat(dollars.replace(/[$,]/g, ''))
      : dollars;
  const safe = Number.isFinite(raw) ? raw : 0;
  return Math.round(safe * 100);
};

export const parseUserCurrency = (input: string): number => {
  const cleaned = input.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};

export const coerceCents = (value: string | number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  const trimmed = value.trim();
  if (!trimmed) return 0;

  if (/[.$,]/.test(trimmed)) {
    return parseUserCurrency(trimmed);
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return 0;

  if (numeric >= 1000) {
    return Math.round(numeric);
  }

  return Math.round(numeric * 100);
};
