// pages/pos/POSPage.tsx - Updated with discount handling
import React, { useState } from 'react';
import POSLayout from '../../components/pos/POSLayout';
import POSGrid from '../../components/pos/POSGrid';
import POSCart from '../../components/pos/POSCart';
import CustomItemModal from '../../components/pos/CustomItemModal';
import PaymentController from '../../components/pos/payment/PaymentController';
import TakeOrderOverlay from '../../components/pos/TakeOrderOverlay';

export default function POSPage() {
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showPaymentController, setShowPaymentController] = useState(false);
  const [showDeliveryOrder, setShowDeliveryOrder] = useState(false);


  // Discount state
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [giftCardDiscount, setGiftCardDiscount] = useState(0);
const [couponDiscount, setCouponDiscount] = useState<{amount: number, name?: string}>({amount: 0});

  const handleAddProduct = (product) => {
    console.log('🛒 Adding product to cart:', product);
    
    try {
      const existingItem = cartItems.find(item => item.id === product.id);
      
      if (existingItem) {
        console.log('📦 Product already in cart, increasing quantity');
        setCartItems(cartItems.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        console.log('✨ Adding new product to cart');
        
        const getPrice = () => {
          if (product.variants && product.variants.length > 0) {
            const defaultVariant = product.variants.find(v => v.isDefault) || product.variants[0];
            if (defaultVariant && defaultVariant.price !== undefined) {
              return defaultVariant.price / 100;
            }
          }
          return product.price || 0;
        };
        
        const newItem = {
          ...product, 
          quantity: 1,
          price: getPrice()
        };
        
        console.log('🎯 New cart item:', newItem);
        setCartItems([...cartItems, newItem]);
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
  setCouponDiscount(0);
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
                    (order.paymentAmount ? order.paymentAmount / 100 : orderData.totals?.grandTotal || 0);
        orderNumber = order.orderNumber;
        orderId = order.id;
        console.log(`✅ Using database order #${orderNumber} with total $${orderTotal}`);
      } else if (order.customProducts && Array.isArray(order.customProducts)) {
        // This is the original TakeOrder structure
        const productsTotal = order.customProducts.reduce((sum, product) => {
          const price = parseFloat(product.price) || 0;
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
      // PaymentController will show OrderCompletionSummary
      // Don't reset anything yet - wait for "New Order" button
    } else {
      console.log('🔄 New Order - Resetting POS state');
      // This is called when user clicks "New Order" in OrderCompletionSummary
      setCartItems([]);
      setSelectedCustomer(null);
      setShowPaymentController(false);
      setAppliedDiscounts([]);
      setGiftCardDiscount(0);
      setCouponDiscount({amount: 0});
      console.log('✅ POS reset to empty state');
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
        price: customItem.price,
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

  // Calculate total with discounts and tax
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = item.customPrice ?? item.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  // Calculate total discount amount
const totalDiscountAmount = appliedDiscounts.reduce((sum, discount) => sum + discount.amount, 0) + giftCardDiscount + couponDiscount.amount;
  
  // Apply discounts before tax
  const discountedSubtotal = Math.max(0, subtotal - totalDiscountAmount);
  const tax = discountedSubtotal * 0.12;
  const calculatedTotal = discountedSubtotal + tax;

  console.log('📊 Current cart state:', cartItems);
  console.log('💰 Pricing breakdown:', {
    subtotal: subtotal.toFixed(2),
    totalDiscounts: totalDiscountAmount.toFixed(2),
    discountedSubtotal: discountedSubtotal.toFixed(2),
    tax: tax.toFixed(2),
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
              cartItems={cartItems}
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
  onRemoveDiscount={handleRemoveDiscount}
  onRemoveGiftCard={handleRemoveGiftCard}
  onRemoveCoupon={handleRemoveCoupon}
/>
        </div>
      </div>

      <CustomItemModal
        open={showCustomItemModal}
        onClose={() => setShowCustomItemModal(false)}
        onConfirm={handleAddCustomItem}
      />
    </POSLayout>
  );
}