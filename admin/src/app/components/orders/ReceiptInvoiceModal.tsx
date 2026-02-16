import { useEffect, useState } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import { EnvelopeIcon } from '@shared/assets/icons';
import { ReactComponent as PrinterIcon } from '@shared/assets/icons/more-icons/printer.svg?react';
import { useApiClient } from '@shared/hooks/useApiClient';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import FormError from '@shared/ui/components/ui/form/FormError';
import InputField from '@shared/ui/forms/input/InputField';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';

interface ReceiptInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: number;
  mode: 'print' | 'email';
  defaultEmail?: string | null;
}

export default function ReceiptInvoiceModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  mode,
  defaultEmail,
}: ReceiptInvoiceModalProps) {
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailStep, setEmailStep] = useState<'options' | 'confirm'>('options');
  const [emailAction, setEmailAction] = useState<'receipt' | 'invoice' | null>(null);
  const [emailTo, setEmailTo] = useState(defaultEmail || '');

  const resetEmailFlow = () => {
    setEmailStep('options');
    setEmailAction(null);
    setEmailTo(defaultEmail || '');
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetEmailFlow();
    }
  }, [isOpen, defaultEmail]);

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

  const handleEmail = async (
    endpoint: string,
    successMessage: string,
    toEmail?: string
  ) => {
    setLoadingAction(endpoint);
    setError(null);
    setSuccess(null);

    try {
      const payload = toEmail ? { toEmail } : undefined;
      const response = await apiClient.post(endpoint, payload);
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
    handleEmail(`/api/email/receipt/${orderId}`, 'Receipt email sent.', emailTo.trim());
  const handlePrintInvoice = () =>
    handlePrint(`/api/print/invoice/${orderId}`, 'Invoice queued for printing.');
  const handlePrintTicket = () =>
    handlePrint(`/api/print/order-ticket/${orderId}`, 'Ticket queued for printing.');
  const handleEmailInvoice = () =>
    handleEmail(`/api/email/invoice/${orderId}`, 'Invoice email sent.', emailTo.trim());

  const startEmailConfirm = (action: 'receipt' | 'invoice') => {
    setEmailAction(action);
    setEmailStep('confirm');
    setError(null);
    setSuccess(null);
  };

  const handleSendNow = () => {
    if (!emailAction) return;
    if (!emailTo.trim()) {
      setError('Enter an email address.');
      return;
    }

    if (emailAction === 'receipt') {
      handleEmailReceipt();
    } else {
      handleEmailInvoice();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {mode === 'print' ? 'Print Options' : 'Email Options'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Order #{formatOrderNumber(orderNumber, orderNumberPrefix)}
        </p>

        {error && <FormError error={error} className="mb-4" />}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            {success}
          </div>
        )}

        <div className="space-y-3">
          {mode === 'print' ? (
            <>
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

              <button
                onClick={handlePrintTicket}
                disabled={loadingAction !== null}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
              >
                <PrinterIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Print Ticket</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Open print dialog for order ticket
                  </div>
                </div>
              </button>
            </>
          ) : emailStep === 'options' ? (
            <>
              <button
                onClick={() => startEmailConfirm('receipt')}
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

              <button
                onClick={() => startEmailConfirm('invoice')}
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
            </>
          ) : (
            <div className="space-y-4">
              <InputField
                label="Send to"
                type="email"
                value={emailTo}
                onChange={(event) => setEmailTo(event.target.value)}
                placeholder="customer@email.com"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEmailStep('options')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={loadingAction !== null}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-60"
                >
                  Send now
                </button>
              </div>
            </div>
          )}
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
