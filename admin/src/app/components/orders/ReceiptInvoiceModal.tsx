import { useState } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import { EnvelopeIcon } from '@shared/assets/icons';
import { ReactComponent as PrinterIcon } from '@shared/assets/icons/more-icons/printer.svg?react';
import { useApiClient } from '@shared/hooks/useApiClient';
import FormError from '@shared/ui/components/ui/form/FormError';

interface ReceiptInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: number;
}

export default function ReceiptInvoiceModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
}: ReceiptInvoiceModalProps) {
  const apiClient = useApiClient();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePrint = async (endpoint: string, successMessage: string) => {
    setLoadingAction(endpoint);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post(endpoint);
      if (response.status >= 400) {
        throw new Error(response.data?.error || 'Print request failed');
      }

      if (response.data?.action === 'browser-print' && response.data?.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
        setSuccess('PDF opened in a new tab.');
      } else if (response.data?.action === 'queued') {
        setSuccess(successMessage);
      } else if (response.data?.action === 'skipped') {
        setError('Printing is disabled for this type.');
      } else {
        setSuccess(successMessage);
      }
    } catch (err) {
      console.error('Print request failed:', err);
      setError(err instanceof Error ? err.message : 'Print request failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmail = async (endpoint: string, successMessage: string) => {
    setLoadingAction(endpoint);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post(endpoint);
      if (response.status >= 400) {
        throw new Error(response.data?.error || 'Email request failed');
      }
      setSuccess(successMessage);
    } catch (err) {
      console.error('Email request failed:', err);
      setError(err instanceof Error ? err.message : 'Email request failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePrintReceipt = () =>
    handlePrint(`/api/print/receipt/${orderId}`, 'Receipt queued for printing.');
  const handleEmailReceipt = () =>
    handleEmail(`/api/email/receipt/${orderId}`, 'Receipt email sent.');
  const handlePrintInvoice = () =>
    handlePrint(`/api/print/invoice/${orderId}`, 'Invoice queued for printing.');
  const handleEmailInvoice = () =>
    handleEmail(`/api/email/invoice/${orderId}`, 'Invoice email sent.');

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Receipt & Invoice Options
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Order #{orderNumber}
        </p>

        {error && <FormError error={error} className="mb-4" />}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            {success}
          </div>
        )}

        <div className="space-y-3">
          {/* Print Receipt */}
          <button
            onClick={handlePrintReceipt}
            disabled={loadingAction !== null}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
          >
            <PrinterIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Print Receipt</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Open print dialog for receipt
              </div>
            </div>
          </button>

          {/* Email Receipt */}
          <button
            onClick={handleEmailReceipt}
            disabled={loadingAction !== null}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Email Receipt</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Send receipt to customer email
              </div>
            </div>
          </button>

          {/* Print Invoice */}
          <button
            onClick={handlePrintInvoice}
            disabled={loadingAction !== null}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
          >
            <PrinterIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Print Invoice</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Open print dialog for invoice
              </div>
            </div>
          </button>

          {/* Email Invoice */}
          <button
            onClick={handleEmailInvoice}
            disabled={loadingAction !== null}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Email Invoice</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Send invoice to customer email
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
