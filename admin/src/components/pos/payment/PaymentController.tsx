// components/pos/payment/PaymentController.tsx - Complete working version with PT-XXXX integration
import { FC, useState } from "react";
import PaymentMethodGrid from "./PaymentMethodGrid";
import SplitPaymentView from "./SplitPaymentView";
import OrderCompletionSummary from "./OrderCompletionSummary";
import CashPaymentModal from "./CashPaymentModal";
import CardPaymentModal from "./CardPaymentModal";
import NotificationModal from "./NotificationModal";
import GiftCardActivationModal from "../../orders/payment/GiftCardActivationModal";
import GiftCardHandoffModal from "../../orders/payment/GiftCardHandoffModal";
import { orderContainsGiftCards, getGiftCardItems } from "../../../utils/giftCardHelpers";

type PaymentView = 'methods' | 'split' | 'completion';

type CompletionData = {
  transactionNumber: string; // PT-XXXX number from backend
  transactionId: string;     // Database ID for the transaction
  totalAmount: number;
  paymentMethods: Array<{ method: string; amount: number; details?: any }>;
  completedOrders: Array<{
    id: string;
    type: 'delivery' | 'pos';
    customerName?: string;
    total: number;
  }>;
};

type Props = {
  open: boolean;
  total: number;
  cartItems?: any[];
  customer?: any; // Customer object with id, firstName, lastName, etc.
  customerName?: string;
  orderIds?: string[]; // Array of order IDs being paid for
  employeeId?: string; // Current employee processing payment
  taxAmount?: number;
  tipAmount?: number;
  onComplete: (transactionData?: any) => void;
  onCancel: () => void;
  // Discount props
  appliedDiscounts?: Array<{type: string, amount: number, description: string}>;
  onDiscountsChange?: (discounts: Array<{type: string, amount: number, description: string}>) => void;
  onGiftCardChange?: (amount: number) => void;
  onCouponChange?: (amount: number, name?: string) => void;
};

const PaymentController: FC<Props> = ({ 
  open, 
  total, 
  cartItems = [], 
  customer,
  customerName,
  orderIds = [],
  employeeId,
  taxAmount = 0,
  tipAmount = 0,
  onComplete, 
  onCancel,
  appliedDiscounts = [],
  onDiscountsChange,
  onGiftCardChange,
  onCouponChange
}) => {
  const [currentView, setCurrentView] = useState<PaymentView>('methods');
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  
  // Payment processing state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  
  // Modal states for popups
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Gift card activation state
  const [showGiftCardActivation, setShowGiftCardActivation] = useState(false);
  const [showGiftCardHandoff, setShowGiftCardHandoff] = useState(false);
  const [giftCardNumbers, setGiftCardNumbers] = useState<any[]>([]);
  const [activatedGiftCards, setActivatedGiftCards] = useState<any[]>([]);

  if (!open) return null;

  // Check if cart contains gift cards
  const hasGiftCards = cartItems ? orderContainsGiftCards(cartItems) : false;
  
  // Debug logging for gift card detection
  if (cartItems && cartItems.length > 0) {
    console.log('🎁 Checking cart for gift cards:', cartItems);
    console.log('🎁 Gift cards detected:', hasGiftCards);
    cartItems.forEach(item => {
      console.log(`🎁 Item: ${item.name} - Is gift card:`, orderContainsGiftCards([item]));
    });
  }

  // Handle payment method selection from grid
  const handleMethodSelect = (method: string) => {
    console.log('🎁 Payment method selected:', method);
    console.log('🎁 Has gift cards:', hasGiftCards);
    console.log('🎁 Gift card numbers collected:', giftCardNumbers.length);
    
    // Check if we need gift card activation first
    if (hasGiftCards && giftCardNumbers.length === 0) {
      console.log('🎁 Showing gift card activation modal');
      setPendingPaymentMethod(method); // Store the selected payment method
      setShowGiftCardActivation(true);
      return;
    }

    if (method === 'split') {
      setCurrentView('split');
    } else if (method === 'cash') {
      setShowCashModal(true);
    } else if (method === 'credit') {
      setShowCardModal(true);
    }
  };

  // Store the selected payment method while waiting for gift card activation
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);

  // Handle gift card activation completion
  const handleGiftCardActivationComplete = (cardData: any[]) => {
    setGiftCardNumbers(cardData);
    setShowGiftCardActivation(false);
    console.log('🎁 Gift card activation data collected for POS:', cardData);
    
    // Continue with the original payment method selection
    if (pendingPaymentMethod) {
      console.log('🎁 Continuing with payment method:', pendingPaymentMethod);
      
      if (pendingPaymentMethod === 'split') {
        setCurrentView('split');
      } else if (pendingPaymentMethod === 'cash') {
        setShowCashModal(true);
      } else if (pendingPaymentMethod === 'credit') {
        setShowCardModal(true);
      }
      
      setPendingPaymentMethod(null); // Clear the pending method
    }
  };

  // ADD BACK THE MISSING COUPON FUNCTIONS
  const handleCouponValidation = async (code: string) => {
    if (!code.trim()) return;
    
    setIsValidatingCoupon(true);
    setCouponError('');
    setCouponSuccess('');
    setIsCouponValid(false);

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          customerId: undefined,
          orderTotal: total,
          productIds: cartItems.map(item => item.id),
          categoryIds: cartItems.map(item => item.category || '').filter(Boolean),
          source: 'POS'
        }),
      });

      const result = await response.json();

      if (result.valid) {
        setIsCouponValid(true);
        setCouponSuccess(`Valid coupon: ${result.coupon.name}`);
        setCouponError('');
      } else {
        setIsCouponValid(false);
        setCouponError(result.error || 'Invalid coupon code');
        setCouponSuccess('');
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setIsCouponValid(false);
      setCouponError('Failed to validate coupon');
      setCouponSuccess('');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCouponAdd = async () => {
    if (!couponCode.trim() || !isCouponValid) return;

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          customerId: undefined,
          orderTotal: total,
          productIds: cartItems.map(item => item.id),
          categoryIds: cartItems.map(item => item.category || '').filter(Boolean),
          source: 'POS'
        }),
      });

      const result = await response.json();

      if (result.valid && onCouponChange) {
        onCouponChange(result.discountAmount, result.coupon.name);
        setCouponSuccess(`Applied: ${result.coupon.name} - $${result.discountAmount.toFixed(2)} off`);
      } else {
        setCouponError(result.error || 'Failed to apply coupon');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('Failed to apply coupon');
    }
  };

  const handleGiftCardChange = (amount: number, redemptionData?: any) => {
    if (onGiftCardChange) {
      onGiftCardChange(amount);
    }
  };

  const handleManualDiscount = (discount: {type: string, amount: number, description: string}) => {
    if (onDiscountsChange) {
      onDiscountsChange([...appliedDiscounts, discount]);
    }
  };

  // Create PT-XXXX transaction via API
  const createPaymentTransaction = async (paymentMethods: Array<{ method: string; amount: number; details?: any }>) => {
    setIsProcessingPayment(true);
    setPaymentError('');

    // Handle guest customers by creating or using a default guest customer
    let customerId = customer?.id;
    
    if (!customerId) {
      console.log('No customer provided, creating/using guest customer...');
      try {
        // Create or get a default guest customer
        const guestResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Walk-in',
            lastName: 'Customer',
            email: null,
            phone: null
          })
        });
        
        if (guestResponse.ok) {
          const guestCustomer = await guestResponse.json();
          customerId = guestCustomer.id;
          console.log('Guest customer created/retrieved:', customerId);
        } else {
          throw new Error('Failed to create guest customer');
        }
      } catch (error) {
        console.error('Failed to create guest customer:', error);
        setPaymentError('Failed to process payment: Customer setup failed');
        setIsProcessingPayment(false);
        return;
      }
    }

    try {
      // Map payment methods to API format
      const apiPaymentMethods = paymentMethods.map(pm => {
        const baseMethod = {
          type: mapPaymentMethodType(pm.method),
          provider: getPaymentProvider(pm.method),
          amount: pm.amount
        };

        // Add method-specific data
        if (pm.method === 'credit' || pm.method === 'debit') {
          return {
            ...baseMethod,
            providerTransactionId: pm.details?.transactionId,
            cardLast4: pm.details?.cardLast4,
            cardBrand: pm.details?.cardBrand
          };
        } else if (pm.method === 'gift_card') {
          return {
            ...baseMethod,
            giftCardNumber: pm.details?.cardNumber
          };
        } else if (pm.method === 'check') {
          return {
            ...baseMethod,
            checkNumber: pm.details?.checkNumber
          };
        }

        return baseMethod;
      });

      const response = await fetch('/api/payment-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          employeeId: employeeId,
          channel: 'POS',
          totalAmount: total,
          taxAmount: taxAmount,
          tipAmount: tipAmount,
          notes: `POS transaction for ${customerName || customer?.firstName + ' ' + customer?.lastName || 'Walk-in Customer'}`,
          paymentMethods: apiPaymentMethods,
          orderIds: orderIds
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      const transaction = await response.json();
      
      // 🎁 Create/activate gift cards if any were purchased
      if (giftCardNumbers.length > 0) {
        console.log('🎁 Creating/activating gift cards in POS...');
        const { purchaseGiftCards } = await import('../../../services/giftCardService');
        
        try {
          // Convert gift card data to purchase format
          const cardsToProcess = giftCardNumbers.map(card => ({
            cardNumber: card.cardNumber, // Physical card number (only for physical cards)
            amount: card.amount,
            type: card.type || 'PHYSICAL', // Use the actual card type from activation modal
            recipientName: card.recipientName || customerName || customer?.firstName + ' ' + customer?.lastName,
            recipientEmail: card.recipientEmail // Include email for digital cards
          }));

          const purchaseResult = await purchaseGiftCards(
            cardsToProcess,
            customerId,
            employeeId,
            transaction.id // Use the transaction ID for tracking
          );

          console.log('✅ Gift cards created/activated in POS:', purchaseResult.cards);
          
          // Store activated cards and show handoff modal immediately
          setActivatedGiftCards(purchaseResult.cards);
          setShowGiftCardHandoff(true);
          
        } catch (error: any) {
          console.error('❌ Failed to create/activate gift cards in POS:', error);
          setPaymentError(`Payment successful but gift card activation failed: ${error.message}`);
        }
      }
      
      const completion: CompletionData = {
        transactionNumber: transaction.transactionNumber,
        transactionId: transaction.id,
        totalAmount: total,
        paymentMethods: paymentMethods,
        completedOrders: transformCartToOrders(cartItems, customerName),
      };

      setCompletionData(completion);
      
      // If we have activated gift cards, show handoff modal instead of completion
      if (activatedGiftCards.length === 0) {
        setCurrentView('completion');
        setShowCashModal(false);
        setShowCardModal(false);

        // Call onComplete with transaction data
        onComplete({
          transactionNumber: transaction.transactionNumber,
          transactionId: transaction.id,
          totalAmount: total,
          customerId: customerId,
          orderIds: orderIds
        });
      } else {
        // Gift cards were created, handoff modal is already showing
        setShowCashModal(false);
        setShowCardModal(false);
      }

    } catch (error) {
      console.error('Payment processing failed:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle single payment completion (cash/card)
  const handleSinglePaymentComplete = (method: string, paymentData?: any) => {
    const paymentMethods = [{ 
      method, 
      amount: total,
      details: paymentData 
    }];
    
    createPaymentTransaction(paymentMethods);
  };

  // Handle split payment completion
  const handleSplitPaymentComplete = (paymentMethods: Array<{ method: string; amount: number; details?: any }>) => {
    createPaymentTransaction(paymentMethods);
  };

  // Handle new order
  const handleNewOrder = () => {
    // If we have activated gift cards, show handoff modal first
    if (activatedGiftCards.length > 0) {
      setShowGiftCardHandoff(true);
      setCurrentView('methods');
      setCompletionData(null);
    } else {
      setCurrentView('methods');
      setCompletionData(null);
      onComplete();
    }
  };

  // Handle back navigation
  const handleBack = () => {
    setCurrentView('methods');
  };

  // Handle unified receipt notification - show modal
  const handleSendReceipt = () => {
    setShowNotificationModal(true);
  };

  // Handle notification success
  const handleNotificationSuccess = (message: string) => {
    setShowNotificationModal(false);
    setNotificationStatus({ type: 'success', message });
    setTimeout(() => setNotificationStatus(null), 3000);
  };

  // Handle notification error  
  const handleNotificationError = (error: string) => {
    setNotificationStatus({ type: 'error', message: error });
    setTimeout(() => setNotificationStatus(null), 5000);
  };

  // Return the appropriate view content
  const renderPaymentView = () => {
    if (currentView === 'methods') {
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="text-[#597485] hover:text-[#4e6575] text-sm font-medium"
            >
              ← Back to Products
            </button>
            <h2 className="text-xl font-bold text-black dark:text-white">
              Select Payment Method
            </h2>
            <div></div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-center">
          Total: <span className="text-2xl font-bold text-[#597485]">${total.toFixed(2)}</span>
        </p>

        {paymentError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm font-medium">Payment Error</p>
            <p className="text-red-500 text-sm">{paymentError}</p>
            <button
              onClick={() => setPaymentError('')}
              className="text-red-600 hover:text-red-700 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {isProcessingPayment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#597485]"></div>
              <p className="text-[#597485] font-medium">Processing Payment...</p>
            </div>
          </div>
        )}

        <PaymentMethodGrid
          selectedMethod=""
          onSelect={handleMethodSelect}
          total={total}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          onCouponValidation={handleCouponValidation}
          isValidatingCoupon={isValidatingCoupon}
          couponError={couponError}
          couponSuccess={couponSuccess}
          isCouponValid={isCouponValid}
          onGiftCardChange={handleGiftCardChange}
          onManualDiscount={handleManualDiscount}
          appliedDiscounts={appliedDiscounts}
          onCouponAdd={handleCouponAdd}
          disabled={isProcessingPayment}
        />

        {/* Cash Payment Modal */}
        <CashPaymentModal
          open={showCashModal}
          total={total}
          onComplete={(paymentData) => handleSinglePaymentComplete('cash', paymentData)}
          onCancel={() => setShowCashModal(false)}
        />

        {/* Card Payment Modal */}
        <CardPaymentModal
          open={showCardModal}
          total={total}
          cardType="credit"
          onComplete={(paymentData) => handleSinglePaymentComplete('credit', paymentData)}
          onCancel={() => setShowCardModal(false)}
        />
      </div>
      );
    }

    if (currentView === 'split') {
      return (
        <SplitPaymentView
          total={total}
          onBack={handleBack}
          onComplete={handleSplitPaymentComplete}
        />
      );
    }

    if (currentView === 'completion' && completionData) {
      return (
        <OrderCompletionSummary
          transactionId={completionData.transactionId}
          transactionNumber={completionData.transactionNumber}
          totalAmount={completionData.totalAmount}
          paymentMethods={completionData.paymentMethods}
          completedOrders={completionData.completedOrders}
          giftCards={activatedGiftCards}
          onSendReceipt={handleSendReceipt}
          onPrintReceipt={() => console.log('Print receipt for', completionData.transactionNumber)}
          onProcessRefund={() => console.log('Process refund for', completionData.transactionNumber)}
          onNewOrder={handleNewOrder}
        />
      );
    }

    return null;
  };

  return (
    <>
      {renderPaymentView()}
      
      {/* Unified Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        transactionNumber={completionData?.transactionNumber}
        transactionId={completionData?.transactionId}
        total={completionData?.totalAmount || total}
        customerEmail={customer?.email}
        customerPhone={customer?.phone}
        customerName={customerName || `${customer?.firstName} ${customer?.lastName}`.trim() || ''}
        onSuccess={handleNotificationSuccess}
        onError={handleNotificationError}
        defaultChannels={['email']}
        title="Send Receipt"
      />
      
      {/* Unified Notification Status Toast */}
      {notificationStatus && (
        <div className={`fixed top-4 right-4 z-[100001] px-6 py-4 rounded-lg shadow-lg text-white font-medium ${
          notificationStatus.type === 'success' 
            ? 'bg-green-600' 
            : 'bg-red-600'
        }`}>
          <div className="flex items-center gap-2">
            {notificationStatus.type === 'success' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {notificationStatus.message}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {notificationStatus.message}
              </>
            )}
          </div>
        </div>
      )}

      {/* Gift Card Activation Modal */}
      <GiftCardActivationModal
        open={showGiftCardActivation}
        onClose={() => setShowGiftCardActivation(false)}
        orderItems={cartItems || []}
        onActivationComplete={handleGiftCardActivationComplete}
      />
      
      {/* Gift Card Handoff Modal */}
      <GiftCardHandoffModal
        open={showGiftCardHandoff}
        onClose={() => {
          setShowGiftCardHandoff(false);
          setActivatedGiftCards([]);
          // After handoff, show completion summary
          setCurrentView('completion');
        }}
        cards={activatedGiftCards}
        customerName={customerName || customer?.firstName + ' ' + customer?.lastName}
        isDigital={(() => {
          const hasDigital = activatedGiftCards.some(card => card.type === 'DIGITAL');
          console.log('🎁 POS HandoffModal Debug:', {
            activatedGiftCards,
            hasDigital,
            cardTypes: activatedGiftCards.map(card => card.type)
          });
          return hasDigital;
        })()}
      />
    </>
  );
};

// Helper functions for payment method mapping
const mapPaymentMethodType = (method: string): string => {
  const methodMap: Record<string, string> = {
    'cash': 'CASH',
    'credit': 'CARD',
    'debit': 'CARD', 
    'gift_card': 'GIFT_CARD',
    'store_credit': 'STORE_CREDIT',
    'check': 'CHECK',
    'cod': 'COD'
  };
  
  return methodMap[method] || 'CASH';
};

const getPaymentProvider = (method: string): string => {
  // Channel-specific provider selection based on your design
  if (method === 'credit' || method === 'debit') {
    return 'SQUARE'; // POS uses Square for card payments
  }
  return 'INTERNAL'; // Cash, gift cards, checks use internal processing
};

const transformCartToOrders = (cartItems: any[], customerName?: string) => {
  if (cartItems.length === 0) {
    return [
      { 
        id: "003524", 
        type: "pos" as const, 
        customerName: customerName || "Walk-in Customer",
        total: 0 
      }
    ];
  }

  return cartItems.map((item, index) => ({
    id: `00352${index + 4}`,
    type: "pos" as const,
    customerName: customerName || "Walk-in Customer",
    total: item.price * item.quantity || 0
  }));
};

export default PaymentController;