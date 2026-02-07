
import { useState } from "react";
import Button from "@shared/ui/components/ui/button/Button";
import FormError from "@shared/ui/components/ui/form/FormError";
import { useApiClient } from "@shared/hooks/useApiClient";
import { formatCurrency } from "@shared/utils/currency";

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
};

const GiftCardHandoffModal: React.FC<Props> = ({
  open,
  onClose,
  cards,
  customerName,
  isDigital = false
}) => {
  // Gift card handoff modal component
  const apiClient = useApiClient();
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  
  if (!open || cards.length === 0) return null;

  const handlePrint = async () => {
    setPrintError(null);
    setPrintSuccess(null);
    setPrintLoading(true);

    try {
      const response = await apiClient.post('/api/print/gift-cards', {
        customerName,
        cards: cards.map((card) => ({
          cardNumber: card.cardNumber,
          amount: card.amount,
          type: card.type,
          recipientName: card.recipientName,
          recipientEmail: card.recipientEmail,
          message: card.message,
        })),
      });

      if (response.status >= 400) {
        throw new Error(response.data?.error || 'Print request failed');
      }

      if (response.data?.action === 'browser-print' && response.data?.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
        setPrintSuccess('Gift card PDF opened in a new tab.');
      } else if (response.data?.action === 'queued') {
        setPrintSuccess('Gift cards queued for printing.');
      } else if (response.data?.action === 'skipped') {
        setPrintError('Printing is disabled for documents.');
      } else {
        setPrintSuccess('Gift cards queued for printing.');
      }
    } catch (err) {
      console.error('Failed to print gift cards:', err);
      setPrintError(err instanceof Error ? err.message : 'Failed to print gift cards');
    } finally {
      setPrintLoading(false);
    }
  };

  const handleEmailSend = async () => {
    // TODO: Implement email sending for digital cards
    console.log('Sending digital gift cards via email...');
    alert('Digital gift card email functionality coming soon!');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100000] p-4">
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {isDigital ? 'Digital Gift Cards Created' : 'Gift Cards Activated'}
          </h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {isDigital
              ? 'Digital gift cards have been created. Print gift cards for handoff or email them to recipients.'
              : 'Physical gift cards have been activated. Please provide the following details to the customer:'
            }
          </p>
        </div>

        {/* Gift Cards List */}
        <div className="space-y-4">
          {cards.map((card, index) => (
            <div
              key={index}
              className="border border-stroke rounded-lg p-4 dark:border-strokedark bg-gray-50 dark:bg-gray-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Card Number:</span>
                    <div className="text-lg font-mono font-bold text-brand-500 bg-white dark:bg-gray-700 p-2 rounded border">
                      {card.cardNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount:</span>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(card.amount)}
                    </div>
                  </div>
                </div>
                
                <div>
                  {card.recipientName && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Recipient:</span>
                      <div className="text-base text-black dark:text-white">
                        {card.recipientName}
                      </div>
                    </div>
                  )}
                  {card.recipientEmail && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email:</span>
                      <div className="text-base text-black dark:text-white">
                        {card.recipientEmail}
                      </div>
                    </div>
                  )}
                  {card.message && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Message:</span>
                      <div className="text-sm text-black dark:text-white italic">
                        "{card.message}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Instructions */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Customer Instructions:
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Keep the gift card number safe - it's required for redemption</li>
            <li>• Gift cards can be used for phone orders, in-store purchases, or website orders</li>
            <li>• No expiration date - gift cards remain active indefinitely</li>
            <li>• Remaining balance stays on the card for future use</li>
          </ul>
        </div>

        {printError && <FormError error={printError} />}
        {printSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {printSuccess}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
          {isDigital && (
            <Button
              onClick={handleEmailSend}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send Email
            </Button>
          )}

          <Button
            onClick={handlePrint}
            disabled={printLoading}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {printLoading ? 'Printing...' : isDigital ? 'Print Gift Cards' : 'Print Details'}
          </Button>

          <Button
            onClick={onClose}
            className="bg-brand-500 hover:bg-brand-600 text-white"
          >
            Complete Transaction
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GiftCardHandoffModal;
