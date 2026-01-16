import { useCallback, useMemo, useState } from 'react';

export interface PaymentEntry {
  method: string;
  amount: number;
  metadata?: Record<string, any>;
}

export interface UsePaymentComposerOptions {
  total: number;
  initialPayments?: PaymentEntry[];
  currencyPrecision?: number;
}

export interface UsePaymentComposerResult {
  payments: PaymentEntry[];
  totalApplied: number;
  remaining: number;
  hasBalance: boolean;
  addPayment: (entry: PaymentEntry) => void;
  removePayment: (index: number) => void;
  resetPayments: () => void;
  replacePayments: (entries: PaymentEntry[]) => void;
}

const DEFAULT_PRECISION = 0;

export const usePaymentComposer = ({
  total,
  initialPayments = [],
  currencyPrecision = DEFAULT_PRECISION,
}: UsePaymentComposerOptions): UsePaymentComposerResult => {
  const [payments, setPayments] = useState<PaymentEntry[]>(initialPayments);
  const roundAmount = useCallback(
    (value: number) =>
      currencyPrecision > 0
        ? Number(value.toFixed(currencyPrecision))
        : Math.round(value),
    [currencyPrecision]
  );

  const totalApplied = useMemo(() => {
    const sum = payments.reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0);
    return roundAmount(sum);
  }, [payments, roundAmount]);

  const remaining = useMemo(() => {
    const balance = total - totalApplied;
    return roundAmount(Math.max(0, balance));
  }, [roundAmount, total, totalApplied]);

  const minBalance = useMemo(
    () =>
      currencyPrecision > 0 ? Number(`0.${'0'.repeat(currencyPrecision)}5`) : 0,
    [currencyPrecision]
  );
  const hasBalance = useMemo(() => remaining > minBalance, [remaining, minBalance]);

  const addPayment = useCallback((entry: PaymentEntry) => {
    setPayments((prev) => [...prev, entry]);
  }, []);

  const removePayment = useCallback((index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetPayments = useCallback(() => {
    setPayments([]);
  }, []);

  const replacePayments = useCallback((entries: PaymentEntry[]) => {
    setPayments(entries);
  }, []);

  return {
    payments,
    totalApplied,
    remaining,
    hasBalance,
    addPayment,
    removePayment,
    resetPayments,
    replacePayments,
  };
};

export default usePaymentComposer;
