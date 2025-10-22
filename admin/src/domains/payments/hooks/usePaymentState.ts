/**
 * Payment State Management Hook
 *
 * Manages core payment processing state including:
 * - Processing/loading states
 * - Error handling
 * - Completion state and data
 * - Quick actions (email/print receipts)
 * - Notification status
 */

import { useState, useCallback } from 'react';

export type QuickActionsState = {
  emailReceipt: boolean;
  printReceipt: boolean;
};

export type CompletionData = {
  transactionNumber: string;
  transactionId: string;
  totalAmount: number;
  paymentMethods: Array<{ method: string; amount: number; details?: any }>;
  completedOrders: Array<{
    id: string;
    type: 'delivery' | 'pos';
    customerName?: string;
    total: number;
  }>;
};

export type NotificationStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

export const usePaymentState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [lastSubmittedPayments, setLastSubmittedPayments] = useState<any[]>([]);
  const [quickActions, setQuickActions] = useState<QuickActionsState>({
    emailReceipt: false,
    printReceipt: false,
  });
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>(null);

  const toggleQuickAction = useCallback((key: keyof QuickActionsState) => {
    setQuickActions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetPaymentState = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setQuickActions({ emailReceipt: false, printReceipt: false });
    setShowCompletion(false);
    setCompletionData(null);
    setLastSubmittedPayments([]);
    setNotificationStatus(null);
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  const setPaymentError = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const completePayment = useCallback((data: CompletionData, payments: any[]) => {
    setCompletionData(data);
    setLastSubmittedPayments(payments);
    setShowCompletion(true);
  }, []);

  const showNotification = useCallback((type: 'success' | 'error', message: string, duration: number = 3000) => {
    setNotificationStatus({ type, message });
    setTimeout(() => setNotificationStatus(null), duration);
  }, []);

  return {
    // State
    isProcessing,
    error,
    showCompletion,
    completionData,
    lastSubmittedPayments,
    quickActions,
    notificationStatus,

    // Actions
    setProcessing,
    setPaymentError,
    toggleQuickAction,
    completePayment,
    showNotification,
    resetPaymentState,
    setShowCompletion,
  };
};
