
import { useEffect } from "react";
import FormError from "@shared/ui/components/ui/form/FormError";
import { Modal } from "@shared/ui/components/ui/modal";

type GiftCardDetails = {
  cardNumber: string;
  amount: number;
  type: 'PHYSICAL' | 'DIGITAL';
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  cards: GiftCardDetails[];
  customerName?: string;
  isDigital?: boolean;
  error?: string | null;
};

const GiftCardHandoffModal: React.FC<Props> = ({
  open,
  onClose,
  cards,
  isDigital = false,
  error = null
}) => {
  if (!open || cards.length === 0) return null;

  const cardCount = cards.length;
  const message = isDigital
    ? cardCount === 1
      ? 'Digital gift card created.'
      : 'Digital gift cards created.'
    : cardCount === 1
      ? 'Gift card activated.'
      : 'Gift cards activated.';

  useEffect(() => {
    if (!open) return;
    if (error) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [open, error, onClose]);

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-sm">
      <div className="p-6 text-center space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isDigital ? 'Gift Card Created' : 'Gift Card Activated'}
        </h2>
        {error ? (
          <FormError error={error} />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        )}
      </div>
    </Modal>
  );
};

export default GiftCardHandoffModal;
