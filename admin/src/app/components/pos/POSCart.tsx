// components/pos/POSCart.tsx - Single card layout
import { useState } from 'react';
// MIGRATION: Updated to use improved customer search
import { useCustomerSearch } from '@domains/customers/hooks/useCustomerService.ts';
import { useTaxRates } from '@shared/hooks/useTaxRates';
import InputField from '@shared/ui/forms/input/InputField';
import { formatPhoneDisplay } from '@shared/ui/forms/PhoneInput';
import { centsToDollars, formatCurrency, parseUserCurrency } from '@shared/utils/currency';
import type { GiftCardSaleData } from '@shared/utils/giftCardHelpers';
import POSCartSummary from './POSCartSummary';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isCustom?: boolean;
  customPrice?: number;
  isTaxable?: boolean;
  category?: string;
  giftCard?: GiftCardSaleData;
};

type Props = {
  items: CartItem[];
  customer: any;
  onCustomerChange: (customer: any) => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onUpdatePrice?: (productId: string, newPrice: number) => void;
  onTakePayment?: () => void;
  onDeliveryOrder?: () => void;
  appliedDiscounts?: Array<{type: string, amount: number, description: string}>;
  giftCardDiscount?: number;
  couponDiscount?: {amount: number, name?: string};
  autoDiscounts?: Array<{id: string, name: string, discountAmount: number}>;
  onRemoveDiscount?: (index: number) => void;
  onRemoveGiftCard?: () => void;
  onRemoveCoupon?: () => void;
  onSaveDraft?: () => void;
  onLoadDrafts?: () => void;
};

export default function POSCart({ 
  items = [], 
  customer, 
  onCustomerChange, 
  onUpdateQuantity, 
  onRemoveItem,
  onUpdatePrice,
  onTakePayment,
  onDeliveryOrder,
  appliedDiscounts = [],
  giftCardDiscount = 0,
  couponDiscount = { amount: 0 },
  autoDiscounts = [],
  onRemoveDiscount,
  onRemoveGiftCard,
  onRemoveCoupon,
  onSaveDraft,
  onLoadDrafts
}: Props) {
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  // Get centralized tax rates
  const { individualTaxRates } = useTaxRates();

    // MIGRATION: Updated to use new customer search interface
  const { 
    query: customerQuery, 
    setQuery: setCustomerQuery, 
    results: customerResults,
    clearSearch
  } = useCustomerSearch();

const subtotal = items.reduce((sum, item) => {
  const itemPrice = item.customPrice ?? item.price ?? 0;
  return sum + itemPrice * item.quantity;
}, 0);
const totalDiscountAmount =
  (appliedDiscounts?.reduce((sum, discount) => sum + discount.amount, 0) || 0) +
  (giftCardDiscount || 0) +
  (couponDiscount?.amount || 0) +
  (autoDiscounts?.reduce((sum, discount) => sum + (discount.discountAmount || 0), 0) || 0);

// Apply discounts proportionally to items
const discountedSubtotal = Math.max(0, subtotal - totalDiscountAmount);
const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 0;

const combinedTaxRate = individualTaxRates.reduce((sum, tax) => sum + tax.rate, 0);
const taxableSubtotal = items.reduce((sum, item) => {
  const itemPrice = item.customPrice ?? item.price ?? 0;
  const isTaxable = item.isTaxable ?? true;
  if (!isTaxable) return sum;
  return sum + itemPrice * item.quantity;
}, 0);

const discountedTaxableSubtotal = Math.round(taxableSubtotal * discountRatio);
const taxBreakdown = individualTaxRates.map((tax) => ({
  name: tax.name,
  rate: tax.rate,
  amount: Math.round(discountedTaxableSubtotal * (tax.rate / 100)),
}));
const taxTotal = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
const total = discountedSubtotal + taxTotal;

const handleCustomerSelect = (selectedCustomer: any) => {
  // Transform the customer data to match what POSCart expects
  const customerData = {
    id: selectedCustomer.id,
    name: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
    email: selectedCustomer.email,
    phone: selectedCustomer.phone,
    firstName: selectedCustomer.firstName,
    lastName: selectedCustomer.lastName,
    image: selectedCustomer.image || null // Add image support
  };
  
  onCustomerChange(customerData);
  setShowCustomerSearch(false);
  clearSearch(); // MIGRATION: Use new clearSearch method
};

  const handleDeliveryOrder = () => {
    window.location.href = '/orders/new';
  };

  const handleTakePayment = () => {
    if (onTakePayment) {
      onTakePayment();
    }
  };

  const handlePriceClick = (itemId: string, currentPrice: number) => {
    setEditingPrice(itemId);
    setTempPrice(centsToDollars(currentPrice).toFixed(2));
  };

  const handlePriceSubmit = (itemId: string) => {
    const newPriceCents = parseUserCurrency(tempPrice);
    if (tempPrice.trim() !== '' && newPriceCents >= 0 && onUpdatePrice) {
      onUpdatePrice(itemId, newPriceCents);
    }
    setEditingPrice(null);
    setTempPrice('');
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      handlePriceSubmit(itemId);
    } else if (e.key === 'Escape') {
      setEditingPrice(null);
      setTempPrice('');
    }
  };

  const handlePriceBlur = (itemId: string) => {
    handlePriceSubmit(itemId);
  };

  return (
    <div className="p-6 h-full">
      {/* Single Card Container */}
      <div className="bg-white dark:bg-boxdark rounded-3xl shadow-xl h-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-black dark:text-white">Current Order</h2>
        </div>

{/* Customer Section */}
<div className="p-6 border-b border-gray-100 dark:border-gray-800">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold text-black dark:text-white flex items-center gap-2">
      <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center overflow-hidden">
        {customer?.image ? (
          <img 
            src={customer.image} 
            alt={customer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
      
      {customer ? (
        <div className="flex items-center gap-2">
          <span>{customer.name}</span>
          {customer.phone && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              • {formatPhoneDisplay(customer.phone)}
            </span>
          )}
        </div>
      ) : (
        <span>Guest Customer</span>
      )}
    </h3>
    
    {customer ? (
      <button
        onClick={() => onCustomerChange(null)}
        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
      >
        Clear
      </button>
    ) : (
      <button
        onClick={() => setShowCustomerSearch(true)}
        className="w-6 h-6 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    )}
  </div>

  {/* Customer Search - Only show when actively searching */}
  {showCustomerSearch && !customer && (
    <div className="space-y-3">
      <InputField
        type="text"
        placeholder="Search customers..."
        value={customerQuery}
        onChange={(e) => setCustomerQuery(e.target.value)}
        className="rounded-xl focus:border-brand-500 focus:ring-brand-500/20"
        autoFocus
      />
      
      {customerQuery && (
<div className="max-h-32 overflow-y-auto border border-stroke dark:border-strokedark rounded-xl pos-scrollbar">
          {customerResults.length > 0 ? (
            customerResults.map((cust) => (
              <button
                key={cust.id}
                onClick={() => handleCustomerSelect(cust)}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-stroke dark:border-strokedark last:border-b-0 transition-colors"
              >
                <p className="font-medium text-black dark:text-white">
                  {cust.firstName} {cust.lastName}
                </p>
                {cust.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{cust.email}</p>
                )}
              </button>
            ))
          ) : customerQuery.length > 2 ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              No customers found matching "{customerQuery}"
            </div>
          ) : (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
              Type at least 3 characters to search
            </div>
          )}
        </div>
      )}
      
      {/* Cancel search button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowCustomerSearch(false);
            clearSearch();
          }}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</div>

        {/* Cart Items */}
<div className="flex-1 overflow-y-auto pos-scrollbar">
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5a2 2 0 002.1 2h9.8a2 2 0 002.1-2L19 13" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Cart is empty</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add products from the grid to get started</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {items.map((item, index) => {
                const itemPrice = item.customPrice ?? item.price ?? 0;
                const isEditingThisPrice = editingPrice === item.id;
                const isGiftCardItem = Boolean(item.giftCard);
                
                return (
                  <div key={item.id} className={`${index !== 0 ? 'pt-4 border-t border-gray-100 dark:border-gray-800' : ''}`}>
                    {/* Product name and delete button */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-black dark:text-white text-sm mb-1">
                          {item.name}
                        </h4>
                        {item.giftCard && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {item.giftCard.cardNumber}
                          </div>
                        )}
                        {item.category === 'TakeOrder' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Transferred from TakeOrder
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Price, Quantity, and Subtotal */}
                    <div className="flex items-center justify-between">
                      {/* Price editing */}
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
                        {isGiftCardItem ? (
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2 py-1">
                            {centsToDollars(itemPrice).toFixed(2)}
                          </span>
                        ) : isEditingThisPrice ? (
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            onKeyDown={(e) => handlePriceKeyDown(e, item.id)}
                            onBlur={() => handlePriceBlur(item.id)}
                            className="w-20 text-sm bg-white dark:bg-boxdark border-2 border-brand-500 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handlePriceClick(item.id, itemPrice)}
                            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded-lg transition-all"
                          >
                            {centsToDollars(itemPrice).toFixed(2)}
                          </button>
                        )}
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={isGiftCardItem}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isGiftCardItem
                              ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-semibold text-black dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={isGiftCardItem}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isGiftCardItem
                              ? 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="font-bold text-black dark:text-white">
                        {formatCurrency(itemPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <POSCartSummary
          hasItems={items.length > 0}
          subtotal={subtotal}
          appliedDiscounts={appliedDiscounts}
          giftCardDiscount={giftCardDiscount}
          couponDiscount={couponDiscount}
          autoDiscounts={autoDiscounts}
          taxBreakdown={taxBreakdown}
          total={total}
          onTakePayment={handleTakePayment}
          onRemoveDiscount={onRemoveDiscount}
          onRemoveGiftCard={onRemoveGiftCard}
          onRemoveCoupon={onRemoveCoupon}
          onSaveDraft={onSaveDraft}
          onLoadDrafts={onLoadDrafts}
        />
      </div>
    </div>
  );
}
