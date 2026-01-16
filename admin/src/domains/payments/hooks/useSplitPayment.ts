/**
 * Split Payment Management Hook
 *
 * Manages split payment functionality:
 * - Split payment rows (multiple payment methods)
 * - Row amounts and tenders
 * - Payment completion tracking per row
 * - Automatic balance coverage
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { PaymentTileId } from './usePaymentModals';

export type SplitPaymentTender = PaymentTileId;

export type SplitPaymentRow = {
  id: string;
  tender: SplitPaymentTender;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  details?: string;
};

export type PaymentPayload = {
  method: string;
  amount: number;
  metadata?: Record<string, any>;
};

const MIN_BALANCE = 1;

export const useSplitPayment = (total: number) => {
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>([]);
  const [splitPayments, setSplitPayments] = useState<Record<string, PaymentPayload>>({});
  const splitIdRef = useRef(0);

  const nextSplitRowId = useCallback(() => {
    splitIdRef.current += 1;
    return `split-${splitIdRef.current}`;
  }, []);

  const splitPaidAmount = useMemo(() => {
    return splitRows.reduce((sum, row) => {
      if (row.status !== 'completed') return sum;
      const payment = splitPayments[row.id];
      return sum + (payment?.amount ?? 0);
    }, 0);
  }, [splitRows, splitPayments]);

  const splitRemaining = useMemo(() => {
    return Math.max(0, total - splitPaidAmount);
  }, [total, splitPaidAmount]);

  const ensureSplitCoverage = useCallback((rows: SplitPaymentRow[]) => {
    // Don't automatically add rows - user controls when to add
    return rows;
  }, []);

  const updateSplitRows = useCallback((updater: (rows: SplitPaymentRow[]) => SplitPaymentRow[]) => {
    setSplitRows((prev) => ensureSplitCoverage(updater(prev)));
  }, [ensureSplitCoverage]);

  const initializeSplitPayment = useCallback(() => {
    setSplitPayments({});
    const initialRows: SplitPaymentRow[] = [
      {
        id: nextSplitRowId(),
        tender: 'cash',
        amount: 0,
        status: 'pending',
      },
    ];
    setSplitRows(initialRows);
  }, [nextSplitRowId]);

  const handleSplitTenderChange = useCallback((rowId: string, tender: SplitPaymentTender) => {
    updateSplitRows((rows) =>
      rows.map((row) =>
        row.id === rowId && row.status === 'pending'
          ? { ...row, tender }
          : row,
      ),
    );
  }, [updateSplitRows]);

  const handleSplitAmountChange = useCallback((rowId: string, amount: number) => {
    updateSplitRows((rows) =>
      rows.map((row) =>
        row.id === rowId && row.status === 'pending'
          ? { ...row, amount: Math.max(0, Math.round(amount)) }
          : row,
      ),
    );
  }, [updateSplitRows]);

  const handleSplitAddRow = useCallback(() => {
    updateSplitRows((rows) => {
      const plannedTotal = rows.reduce((sum, row) => sum + row.amount, 0);
      const remainingAmount = Math.max(0, total - plannedTotal);
      const nextRow: SplitPaymentRow = {
        id: nextSplitRowId(),
        tender: 'cash',
        amount: remainingAmount,
        status: 'pending',
      };
      return [...rows, nextRow];
    });
  }, [nextSplitRowId, total, updateSplitRows]);

  const handleSplitDeleteRow = useCallback((rowId: string) => {
    updateSplitRows((rows) => {
      // Don't allow deleting if only 1 row or if row is completed
      const row = rows.find(r => r.id === rowId);
      if (rows.length <= 1 || row?.status === 'completed') {
        return rows;
      }
      return rows.filter((row) => row.id !== rowId);
    });
  }, [updateSplitRows]);

  const markRowProcessing = useCallback((rowId: string) => {
    updateSplitRows((rows) =>
      rows.map((item) =>
        item.id === rowId ? { ...item, status: 'processing' } : item,
      ),
    );
  }, [updateSplitRows]);

  const completeRowPayment = useCallback((rowId: string, payment: PaymentPayload, details?: string) => {
    setSplitPayments((prev) => ({ ...prev, [rowId]: payment }));
    updateSplitRows((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              status: 'completed',
              details: details,
            }
          : row,
      ),
    );
  }, [updateSplitRows]);

  const cancelRowPayment = useCallback((rowId: string) => {
    updateSplitRows((rows) =>
      rows.map((row) =>
        row.id === rowId ? { ...row, status: 'pending' } : row,
      ),
    );
  }, [updateSplitRows]);

  const resetSplitPayment = useCallback(() => {
    setSplitRows([]);
    setSplitPayments({});
    splitIdRef.current = 0;
  }, []);

  const getCompletedPayments = useCallback((): PaymentPayload[] => {
    const completedRows = splitRows.filter((row) => row.status === 'completed');
    return completedRows
      .map((row) => splitPayments[row.id])
      .filter((payment): payment is PaymentPayload => Boolean(payment));
  }, [splitRows, splitPayments]);

  return {
    // State
    splitRows,
    splitPayments,
    splitPaidAmount,
    splitRemaining,

    // Actions
    initializeSplitPayment,
    handleSplitTenderChange,
    handleSplitAmountChange,
    handleSplitAddRow,
    handleSplitDeleteRow,
    markRowProcessing,
    completeRowPayment,
    cancelRowPayment,
    resetSplitPayment,
    getCompletedPayments,
    updateSplitRows,
  };
};
