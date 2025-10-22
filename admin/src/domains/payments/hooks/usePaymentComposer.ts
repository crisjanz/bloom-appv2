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

const DEFAULT_PRECISION = 2;

export const usePaymentComposer = ({
  total,
  initialPayments = [],
  currencyPrecision = DEFAULT_PRECISION,
}: UsePaymentComposerOptions): UsePaymentComposerResult => {
  const [payments, setPayments] = useState<PaymentEntry[]>(initialPayments);

  const totalApplied = useMemo(() => {
    const sum = payments.reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0);
    return Number(sum.toFixed(currencyPrecision));
  }, [payments, currencyPrecision]);

  const remaining = useMemo(() => {
    const balance = total - totalApplied;
    return Number(Math.max(0, balance).toFixed(currencyPrecision));
  }, [total, totalApplied, currencyPrecision]);

  const hasBalance = useMemo(() => remaining > Number(`0.${'0'.repeat(currencyPrecision)}5`), [remaining, currencyPrecision]);

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
