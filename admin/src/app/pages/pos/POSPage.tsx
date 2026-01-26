// pages/pos/POSPage.tsx - Local state cart with draft functionality
import React, { useState } from 'react';
import POSLayout from '@app/components/pos/POSLayout';
import POSGrid from '@app/components/pos/POSGrid';
import POSCart from '@app/components/pos/POSCart';
import CustomItemModal from '@app/components/pos/CustomItemModal';
import ProductVariantModal from '@app/components/pos/ProductVariantModal';
import PaymentController from '@app/components/pos/payment/PaymentController';
import TakeOrderOverlay from '@app/components/pos/TakeOrderOverlay';
import { useTaxRates } from '@shared/hooks/useTaxRates';
import { coerceCents, dollarsToCents } from '@shared/utils/currency';

export default function POSPage() {
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Get centralized tax rates
  const { individualTaxRates } = useTaxRates();
  const [cartItems, setCartItems] = useState([]);
  const [showPaymentController, setShowPaymentController] = useState(false);
  const [showDeliveryOrder, setShowDeliveryOrder] = useState(false);

  // Discount state
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [giftCardDiscount, setGiftCardDiscount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState<{amount: number, name?: string}>({amount: 0});
  const [autoDiscounts, setAutoDiscounts] = useState([]);

  // Draft state
  const [showDraftModal, setShowDraftModal] = useState(false);

  const normalizePriceCents = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return value >= 1000 ? Math.round(value) : dollarsToCents(value);
  };

  // Check for automatic discounts when cart changes
  const checkAutomaticDiscounts = async (currentCartItems) => {
    try {
      const cartItemsForAPI = currentCartItems.map(item => ({
        id: item.id,
        categoryId: item.categoryId,
        categoryIds: item.categoryIds || (item.categoryId ? [item.categoryId] : []),
        quantity: item.quantity,
        price: item.customPrice ?? item.price ?? item.unitPrice ?? 0
      }));
      
      console.log('🔍 Sending cart items to auto-discount API:', cartItemsForAPI);
      
      const response = await fetch('/api/discounts/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cartItemsForAPI,
          source: 'POS'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🎯 Auto discount response:', result);
        if (result.discounts && result.discounts.length > 0) {
          console.log('✅ Setting auto discounts:', result.discounts);
          setAutoDiscounts(result.discounts);
        } else {
          setAutoDiscounts([]);
        }
      }
    } catch (error) {
      console.error('Failed to check automatic discounts:', error);
    }
  };

  const handleAddProduct = (product) => {
    console.log('🛒 Adding product to cart:', product);
    
    try {
      // Check if product has multiple variants (non-default variants)
      const hasVariants = product.variants && product.variants.length > 1;
      const hasNonDefaultVariants = product.variants && product.variants.some(v => !v.isDefault);
      
      console.log('🔍 Variant check:', {
        productName: product.name,
        variantsLength: product.variants?.length || 0,
        hasVariants,
        hasNonDefaultVariants,
        variants: product.variants?.map(v => ({ name: v.name, isDefault: v.isDefault }))
      });
      
      if (hasVariants && hasNonDefaultVariants) {
        console.log('🎛️ Product has variants, showing selection modal');
        setSelectedProductForVariants(product);
        setShowVariantModal(true);
        return;
      }
      
      // No variants or only default variant - add directly
      const existingItem = cartItems.find(item => item.id === product.id);
      
      if (existingItem) {
        console.log('📦 Product already in cart, increasing quantity');
        const updatedCartItems = cartItems.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        setCartItems(updatedCartItems);
        checkAutomaticDiscounts(updatedCartItems);
      } else {
        console.log('✨ Adding new product to cart');
        
        const getPriceCents = () => {
          if (product.variants && product.variants.length > 0) {
            const defaultVariant = product.variants.find(v => v.isDefault) || product.variants[0];
            if (typeof defaultVariant?.calculatedPrice === 'number') {
              return dollarsToCents(defaultVariant.calculatedPrice);
            }
            if (typeof defaultVariant?.priceDifference === 'number') {
              const basePriceCents = normalizePriceCents(product.price || 0);
              return basePriceCents + Math.round(defaultVariant.priceDifference || 0);
            }
            if (typeof defaultVariant?.price === 'number') {
              return normalizePriceCents(defaultVariant.price);
            }
          }
          return normalizePriceCents(product.price || 0);
        };
        
        const newItem = {
          ...product, 
          quantity: 1,
          price: getPriceCents(),
          isTaxable: product.isTaxable ?? true // Include taxability from product data
        };
        
        console.log('🎯 New cart item:', newItem);
        const updatedCartItems = [...cartItems, newItem];
        setCartItems(updatedCartItems);
        checkAutomaticDiscounts(updatedCartItems);
      }
    } catch (error) {
      console.error('❌ Error adding product to cart:', error);
    }
  };

  const handleRemoveDiscount = (index: number) => {
    const newDiscounts = appliedDiscounts.filter((_, i) => i !== index);
    setAppliedDiscounts(newDiscounts);
  };

  const handleRemoveGiftCard = () => {
    setGiftCardDiscount(0);
  };

  const handleRemoveCoupon = () => {
    setCouponDiscount({amount: 0});
  };

  const handleVariantSelection = (variant) => {
    console.log('🎛️ Variant selected:', variant);
    
    try {
      // Create a unique ID for this variant selection
      const variantItemId = `${selectedProductForVariants.id}-${variant.id}`;
      
      const existingItem = cartItems.find(item => item.id === variantItemId);
      
      if (existingItem) {
        console.log('📦 Variant already in cart, increasing quantity');
        setCartItems(cartItems.map(item => 
          item.id === variantItemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        console.log('✨ Adding new variant to cart');
        
        const newItem = {
          ...selectedProductForVariants,
          id: variantItemId,
          name: `${selectedProductForVariants.name} - ${variant.name}`,
          quantity: 1,
          price: dollarsToCents(variant.price),
          variantId: variant.id,
          variantName: variant.name,
          isTaxable: selectedProductForVariants.isTaxable ?? true
        };
        
        console.log('🎯 New variant cart item:', newItem);
        setCartItems([...cartItems, newItem]);
      }
      
      // Close modal
      setShowVariantModal(false);
      setSelectedProductForVariants(null);
    } catch (error) {
      console.error('❌ Error adding variant to cart:', error);
    }
  };

  const handleDeliveryOrder = () => {
    console.log('🚚 Opening delivery order overlay');
    setShowDeliveryOrder(true);
  };

  const handleDeliveryOrderComplete = (orderData) => {
    console.log('✅ Delivery order completed', orderData);
    
    // Handle POS transfer (draft + direct transfer)
    if (orderData.type === 'pos_transfer') {
      console.log('🔄 Processing POS transfer with draft data');
      
      // Set customer if provided
      if (orderData.customer) {
        setSelectedCustomer({
          id: orderData.customer.id || null,
          name: `${orderData.customer.firstName} ${orderData.customer.lastName}`.trim(),
          email: orderData.customer.email,
          phone: orderData.customer.phone,
          firstName: orderData.customer.firstName,
          lastName: orderData.customer.lastName
        });
      }

      // Convert and add items to cart (like product grid)
      const cartItemsToAdd = convertOrdersToCartItems(orderData);
      setCartItems(prev => [...prev, ...cartItemsToAdd]);
      
      console.log(`✅ Added ${cartItemsToAdd.length} draft orders to POS cart`);
      setShowDeliveryOrder(false);
      return;
    }
    
    // Convert TakeOrder data to POS cart items
    if (orderData && orderData.orders) {
      const cartItemsToAdd = convertOrdersToCartItems(orderData);
      
      // Add all items to cart
      cartItemsToAdd.forEach(item => {
        setCartItems(prevItems => {
          const existingItem = prevItems.find(existing => existing.id === item.id);
          
          if (existingItem) {
            // Increase quantity if item already exists
            return prevItems.map(existing => 
              existing.id === item.id 
                ? { ...existing, quantity: existing.quantity + item.quantity }
                : existing
            );
          } else {
            // Add new item
            return [...prevItems, item];
          }
        });
      });
      
      console.log(`🛒 Added ${cartItemsToAdd.length} items to POS cart`);
    }
    
    setShowDeliveryOrder(false);
  };

  // Helper function to convert TakeOrder data to POS cart items
  const convertOrdersToCartItems = (orderData) => {
    const cartItems = [];
    
    console.log('🔍 Converting orders to cart items:', orderData.orders);
    
    orderData.orders.forEach((order, orderIndex) => {
      console.log(`🔍 Processing order ${orderIndex}:`, order);
      console.log(`🔍 Order keys:`, Object.keys(order));
      console.log(`🔍 Order number field:`, order.orderNumber, order.id, order.number);
      
      // Handle different order structures (from TakeOrder vs from Database)
      let orderTotal = 0;
      let orderNumber = orderIndex + 1;
      let orderId = order.id;
      
      if (order.orderNumber) {
        // This is from database with real order number (draft or completed)
        // Use individual order total if available, otherwise fall back to proportional calculation
        orderTotal = order.individualTotal || 
                    (order.paymentAmount ? order.paymentAmount : orderData.totals?.grandTotal || 0);
        orderNumber = order.orderNumber;
        orderId = order.id;
        console.log(`✅ Using database order #${orderNumber} with total $${orderTotal}`);
      } else if (order.customProducts && Array.isArray(order.customProducts)) {
        // This is the original TakeOrder structure
        const productsTotal = order.customProducts.reduce((sum, product) => {
          const price = coerceCents(product.price || "0");
          const qty = parseInt(product.qty) || 1;
          return sum + (price * qty);
        }, 0);
        orderTotal = productsTotal + (order.deliveryFee || 0);
        orderNumber = orderIndex + 1; // Fallback for non-database orders
        console.log(`📝 Using TakeOrder structure with total $${orderTotal}`);
      } else {
        // Fallback
        orderTotal = order.grandTotal || order.totalAmount || order.total || 0;
        orderNumber = orderIndex + 1;
        orderId = order.id;
        console.log(`⚠️ Using fallback structure with total $${orderTotal}`);
      }
      
      console.log(`💰 Order ${orderIndex} total: $${orderTotal}, number: ${orderNumber}`);
      
      // Create single consolidated item for the entire order
      const orderItem = {
        id: `order-${orderId || orderIndex}-${Date.now()}`,
        name: `Order #${orderNumber}`,
        category: 'TakeOrder',
        price: orderTotal,
        quantity: 1,
        isCustom: true,
        tax: false,
        draftOrderId: orderId // Store the order ID for updating payment status later
      };
      
      cartItems.push(orderItem);
    });
    
    console.log('✅ Converted cart items:', cartItems);
    return cartItems;
  };

  const handleDeliveryOrderCancel = () => {
    console.log('❌ Delivery order cancelled');
    setShowDeliveryOrder(false);
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    console.log('🔢 Updating quantity:', productId, newQuantity);
    
    try {
      if (newQuantity <= 0) {
        setCartItems(cartItems.filter(item => item.id !== productId));
      } else {
        setCartItems(cartItems.map(item => 
          item.id === productId 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      }
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
    }
  };

  const handleTakePayment = () => {
    console.log('🔔 Opening payment controller with items:', cartItems);
    setShowPaymentController(true);
  };

  const handlePaymentComplete = (transactionData) => {
    if (transactionData) {
      console.log('💳 Payment completed successfully!', transactionData);
      // IMMEDIATELY clear cart and discounts to prevent double-charging
      setCartItems([]);
      setAppliedDiscounts([]);
      setGiftCardDiscount(0);
      setCouponDiscount({amount: 0});
      console.log('✅ Cart cleared immediately after successful payment');
      // PaymentController will show OrderCompletionSummary
      // Keep customer and payment controller open for receipt options
    } else {
      console.log('🔄 New Order - Resetting remaining POS state');
      // This is called when user clicks "New Order" in OrderCompletionSummary
      setSelectedCustomer(null);
      setShowPaymentController(false);
      console.log('✅ POS fully reset to empty state');
    }
  };

  const handlePaymentCancel = () => {
    console.log('❌ Payment cancelled');
    setShowPaymentController(false);
  };

  const handleRemoveItem = (productId) => {
    console.log('🗑️ Removing item:', productId);
    
    try {
      setCartItems(cartItems.filter(item => item.id !== productId));
    } catch (error) {
      console.error('❌ Error removing item:', error);
    }
  };

  const handleUpdatePrice = (productId, newPrice) => {
    console.log('💰 Updating price:', productId, newPrice);
    
    try {
      setCartItems(cartItems.map(item => 
        item.id === productId 
          ? { ...item, customPrice: newPrice }
          : item
      ));
    } catch (error) {
      console.error('❌ Error updating price:', error);
    }
  };

  const handleAddCustomItem = (customItem) => {
    console.log('🔧 Adding custom item:', customItem);
    
    try {
      const newItem = {
        id: `custom-${Date.now()}`,
        name: customItem.name,
        price: dollarsToCents(customItem.price),
        category: customItem.category || 'Custom',
        isCustom: true,
        quantity: 1
      };
      setCartItems([...cartItems, newItem]);
      setShowCustomItemModal(false);
    } catch (error) {
      console.error('❌ Error adding custom item:', error);
    }
  };

  // Draft functionality
  const handleSaveDraft = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty, nothing to save as draft');
      return;
    }

    try {
      const orderData = {
        type: 'DELIVERY', // Default to delivery, can be changed later
        status: 'DRAFT',
        customerId: selectedCustomer?.id || null,
        employeeId: 'pos-employee', // TODO: Get actual employee ID
        orderItems: cartItems.map(item => ({
          customName: item.name,
          unitPrice: item.customPrice ?? item.price ?? 0,
          quantity: item.quantity
        })),
        cardMessage: 'POS Draft Order',
        specialInstructions: `Draft saved from POS. Applied discounts: ${appliedDiscounts.length > 0 ? appliedDiscounts.map(d => d.description).join(', ') : 'None'}`
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        alert(`Draft saved as Order #${order.orderNumber}`);
        
        // Clear cart after saving
        setCartItems([]);
        setAppliedDiscounts([]);
        setGiftCardDiscount(0);
        setCouponDiscount({amount: 0});
        setAutoDiscounts([]);
        setSelectedCustomer(null);
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    }
  };

  const handleLoadDrafts = () => {
    setShowDraftModal(true);
  };

  const handleLoadDraft = async (order) => {
    try {
      console.log('Loading draft order:', order);
      
      // Convert order items back to cart format
      const draftCartItems = order.orderItems.map((item, index) => ({
        id: `draft-${order.id}-${index}`,
        name: item.customName || `Item ${index + 1}`,
        price: item.unitPrice,
        quantity: item.quantity,
        isCustom: true,
        isTaxable: true,
        draftOrderId: order.id
      }));

      // Set customer if available
      if (order.customer) {
        setSelectedCustomer({
          id: order.customer.id,
          name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          email: order.customer.email,
          phone: order.customer.phone,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName
        });
      }

      // Load items into cart
      setCartItems(draftCartItems);
      
      // Close modal
      setShowDraftModal(false);
      
      console.log(`✅ Loaded draft order #${order.orderNumber} with ${draftCartItems.length} items`);
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('Failed to load draft. Please try again.');
    }
  };

  // Calculate total with discounts and tax
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = item.customPrice ?? item.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  // Calculate total discount amount
  const totalDiscountAmount =
    appliedDiscounts.reduce((sum, discount) => sum + discount.amount, 0) +
    giftCardDiscount +
    couponDiscount.amount +
    autoDiscounts.reduce((sum, discount) => sum + (discount.discountAmount || 0), 0);
  
  // Apply discounts proportionally and calculate tax per item
  const discountedSubtotal = Math.max(0, subtotal - totalDiscountAmount);
  const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 0;

  const combinedTaxRate = individualTaxRates.reduce((sum, tax) => sum + tax.rate, 0);
  const taxableSubtotal = cartItems.reduce((sum, item) => {
    const itemPrice = item.customPrice ?? item.price;
    const isTaxable = item.isTaxable ?? true;
    if (!isTaxable) return sum;
    return sum + itemPrice * item.quantity;
  }, 0);
  
  const discountedTaxableSubtotal = Math.round(taxableSubtotal * discountRatio);
  const taxTotal = Math.round(discountedTaxableSubtotal * (combinedTaxRate / 100));
  const calculatedTotal = discountedSubtotal + taxTotal;

  console.log('📊 Current cart state:', cartItems);
  console.log('💰 Pricing breakdown:', {
    subtotal: subtotal.toFixed(2),
    totalDiscounts: totalDiscountAmount.toFixed(2),
    discountedSubtotal: discountedSubtotal.toFixed(2),
    tax: taxTotal.toFixed(2),
    total: calculatedTotal.toFixed(2)
  });

  return (
    <POSLayout>
      <div className="flex h-full bg-gray-50 dark:bg-gray-900">
        <div className="w-[62.5%]">
          {showPaymentController ? (
            <PaymentController
              open={showPaymentController}
              total={calculatedTotal}
              taxAmount={taxTotal}
              cartItems={cartItems}
              customer={selectedCustomer}
              customerName={selectedCustomer?.name}
              onComplete={handlePaymentComplete}
              onCancel={() => setShowPaymentController(false)}
              appliedDiscounts={appliedDiscounts}
              onDiscountsChange={setAppliedDiscounts}
              onGiftCardChange={setGiftCardDiscount}
              onCouponChange={(amount, name) => setCouponDiscount({amount, name})}
            />
          ) : showDeliveryOrder ? (
            <TakeOrderOverlay
              onComplete={handleDeliveryOrderComplete}
              onCancel={handleDeliveryOrderCancel}
              selectedCustomer={selectedCustomer}
            />
          ) : (
            <POSGrid
              onAddProduct={handleAddProduct}
              onShowCustomModal={() => setShowCustomItemModal(true)}
              onDeliveryOrder={handleDeliveryOrder}
            />
          )}
        </div>
        <div className="w-[37.5%]">
          <POSCart
            items={cartItems}
            customer={selectedCustomer}
            onCustomerChange={setSelectedCustomer}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdatePrice={handleUpdatePrice}
            onTakePayment={handleTakePayment}
            onDeliveryOrder={handleDeliveryOrder}
            appliedDiscounts={appliedDiscounts}
            giftCardDiscount={giftCardDiscount}
            couponDiscount={couponDiscount}
            autoDiscounts={autoDiscounts}
            onRemoveDiscount={handleRemoveDiscount}
            onRemoveGiftCard={handleRemoveGiftCard}
            onRemoveCoupon={handleRemoveCoupon}
            onSaveDraft={handleSaveDraft}
            onLoadDrafts={handleLoadDrafts}
          />
        </div>
      </div>

      <CustomItemModal
        open={showCustomItemModal}
        onClose={() => setShowCustomItemModal(false)}
        onConfirm={handleAddCustomItem}
      />

      <ProductVariantModal
        open={showVariantModal}
        product={selectedProductForVariants}
        onClose={() => {
          setShowVariantModal(false);
          setSelectedProductForVariants(null);
        }}
        onSelectVariant={handleVariantSelection}
      />

      {/* Draft Modal */}
      {showDraftModal && (
        <DraftModal
          onClose={() => setShowDraftModal(false)}
          onLoadDraft={handleLoadDraft}
        />
      )}
    </POSLayout>
  );
}

// Draft Modal Component
function DraftModal({ onClose, onLoadDraft }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const response = await fetch('/api/orders?status=DRAFT&limit=20');
        if (response.ok) {
          const data = await response.json();
          setDrafts(data.orders || []);
        }
      } catch (error) {
        console.error('Error fetching drafts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Load Draft Order</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No draft orders found</div>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => onLoadDraft(draft)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Order #{draft.orderNumber}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {draft.customer ? `${draft.customer.firstName} ${draft.customer.lastName}` : 'No customer'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(draft.createdAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
