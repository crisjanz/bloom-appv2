/**
 * Payment Modals Management Hook
 *
 * Manages all modal states and contexts for payment flow:
 * - Active payment modal (cash, card, manual methods)
 * - Modal context (single payment vs split payment)
 * - Gift card handoff modal
 * - Notification modal
 * - Adjustments/discounts modal
 */

import { useState, useCallback } from 'react';

export type PaymentTileId =
  | 'cash'
  | 'card_square'
  | 'card_stripe'
  | 'house_account'
  | 'pay_later'
  | 'cheque'
  | 'split'
  | 'discounts';

export type ModalContext =
  | null
  | {
      mode: 'single';
      tender: PaymentTileId;
      amount: number;
    }
  | {
      mode: 'split';
      tender: PaymentTileId;
      amount: number;
      rowId: string;
    };

export const usePaymentModals = () => {
  const [activeModal, setActiveModal] = useState<PaymentTileId | null>(null);
  const [modalContext, setModalContext] = useState<ModalContext>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showGiftCardHandoff, setShowGiftCardHandoff] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const openModal = useCallback((tileId: PaymentTileId, amount: number, rowId?: string) => {
    if (rowId) {
      setModalContext({
        mode: 'split',
        tender: tileId,
        amount,
        rowId,
      });
    } else {
      setModalContext({
        mode: 'single',
        tender: tileId,
        amount,
      });
    }
    setActiveModal(tileId);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalContext(null);
  }, []);

  const resetModals = useCallback(() => {
    setActiveModal(null);
    setModalContext(null);
    setShowNotificationModal(false);
    setShowGiftCardHandoff(false);
    setShowAdjustments(false);
  }, []);

  return {
    // State
    activeModal,
    modalContext,
    showNotificationModal,
    showGiftCardHandoff,
    showAdjustments,

    // Actions
    openModal,
    closeModal,
    setActiveModal,
    setModalContext,
    setShowNotificationModal,
    setShowGiftCardHandoff,
    setShowAdjustments,
    resetModals,
  };
};
