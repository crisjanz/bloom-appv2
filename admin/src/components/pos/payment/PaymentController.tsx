// components/pos/payment/PaymentController.tsx - Complete working version
import { FC, useState } from "react";
import PaymentMethodGrid from "./PaymentMethodGrid";
import SplitPaymentView from "./SplitPaymentView";
import OrderCompletionSummary from "./OrderCompletionSummary";
import CashPaymentModal from "./CashPaymentModal";
import CardPaymentModal from "./CardPaymentModal";

type PaymentView = 'methods' | 'split' | 'completion';

type CompletionData = {
  transactionId: string;
  totalAmount: number;
  paymentMethods: Array<{ method: string; amount: number }>;
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
  customerName?: string;
  onComplete: () => void;
  onCancel: () => void;
  // Discount props - ADD THESE BACK
  appliedDiscounts?: Array<{type: string, amount: number, description: string}>;
  onDiscountsChange?: (discounts: Array<{type: string, amount: number, description: string}>) => void;
  onGiftCardChange?: (amount: number) => void;
  onCouponChange?: (amount: number, name?: string) => void;
};

const PaymentController: FC<Props> = ({ 
  open, 
  total, 
  cartItems = [], 
  customerName,
  onComplete, 
  onCancel,
  // ADD THESE BACK
  appliedDiscounts = [],
  onDiscountsChange,
  onGiftCardChange,
  onCouponChange
}) => {
  const [currentView, setCurrentView] = useState<PaymentView>('methods');
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  
  // Modal states for popups - KEEP THESE
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  if (!open) return null;

  // Handle payment method selection from grid
  const handleMethodSelect = (method: string) => {
    if (method === 'split') {
      setCurrentView('split');
    } else if (method === 'cash') {
      setShowCashModal(true);
    } else if (method === 'credit') {
      setShowCardModal(true);
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

  // Handle single payment completion (cash/card)
  const handleSinglePaymentComplete = (method: string, paymentData?: any) => {
    const transactionId = generateTransactionId();
    
    const completion: CompletionData = {
      transactionId,
      totalAmount: total,
      paymentMethods: [{ method, amount: total }],
      completedOrders: transformCartToOrders(cartItems, customerName),
    };

    setCompletionData(completion);
    setCurrentView('completion');
    setShowCashModal(false);
    setShowCardModal(false);
  };

  // Handle split payment completion
  const handleSplitPaymentComplete = (paymentMethods: Array<{ method: string; amount: number }>) => {
    const transactionId = generateTransactionId();
    
    const completion: CompletionData = {
      transactionId,
      totalAmount: total,
      paymentMethods,
      completedOrders: transformCartToOrders(cartItems, customerName),
    };

    setCompletionData(completion);
    setCurrentView('completion');
  };

  // Handle new order
  const handleNewOrder = () => {
    setCurrentView('methods');
    setCompletionData(null);
    onComplete();
  };

  // Handle back navigation
  const handleBack = () => {
    setCurrentView('methods');
  };

  // Return the appropriate view content
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
        totalAmount={completionData.totalAmount}
        paymentMethods={completionData.paymentMethods}
        completedOrders={completionData.completedOrders}
        onEmailReceipt={() => console.log('Email receipt')}
        onPrintReceipt={() => console.log('Print receipt')}
        onProcessRefund={() => console.log('Process refund')}
        onNewOrder={handleNewOrder}
      />
    );
  }

  return null;
};

// Helper functions
const generateTransactionId = (): string => {
  const timestamp = Date.now();
  const id = (timestamp % 99999).toString().padStart(5, '0');
  return `PT-${id}`;
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