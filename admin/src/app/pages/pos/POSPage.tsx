// pages/pos/POSPage.tsx - Local state cart with draft functionality
import { useCallback, useEffect, useRef, useState } from 'react';
import POSLayout from '@app/components/pos/POSLayout';
import POSGrid from '@app/components/pos/POSGrid';
import POSCart from '@app/components/pos/POSCart';
import CustomItemModal from '@app/components/pos/CustomItemModal';
import ProductVariantModal from '@app/components/pos/ProductVariantModal';
import PaymentController from '@app/components/pos/payment/PaymentController';
import TakeOrderOverlay from '@app/components/pos/TakeOrderOverlay';
import GiftCardSaleModal from '@app/components/gift-cards/GiftCardSaleModal';
import { useApiClient } from '@shared/hooks/useApiClient';
import { useTaxRates } from '@shared/hooks/useTaxRates';
import { useBarcodeScanner } from '@shared/hooks/useBarcodeScanner';
import { getOrCreateGuestCustomer } from '@shared/utils/customerHelpers';
import { Modal } from '@shared/ui/components/ui/modal';
import { centsToDollars, coerceCents, dollarsToCents, formatCurrency } from '@shared/utils/currency';
import {
  GiftCardSaleData,
  getGiftCardInfo,
  getGiftCardNumberType,
  isGiftCardNumber,
  isGiftCardProduct,
} from '@shared/utils/giftCardHelpers';
import { deleteLocalDraft, getLocalDrafts, saveLocalDraft, LocalDraft } from '@shared/utils/posLocalDrafts';

const AUTO_RESTORE_WINDOW_MS = 5 * 60 * 1000;

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getCustomerLabel = (customer: any) => {
  if (!customer) return 'No customer';
  if (customer.name) return customer.name;
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'No customer';
};

const formatRelativeTime = (dateString: string) => {
  const savedAt = new Date(dateString).getTime();
  if (!Number.isFinite(savedAt)) return 'Unknown time';

  const diffMs = Date.now() - savedAt;
  if (diffMs < 60_000) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const formatDraftDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export default function POSPage() {
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const apiClient = useApiClient();
  const [cartSessionId, setCartSessionId] = useState<string>(() => generateUUID());
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);
  const [draftToast, setDraftToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Get centralized tax rates
  const { individualTaxRates } = useTaxRates();
  const [cartItems, setCartItems] = useState([]);
  const [showPaymentController, setShowPaymentController] = useState(false);
  const [showDeliveryOrder, setShowDeliveryOrder] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [giftCardModalMode, setGiftCardModalMode] = useState<'physical' | 'electronic'>('electronic');
  const [giftCardCardNumber, setGiftCardCardNumber] = useState<string | undefined>(undefined);
  const [giftCardDefaultAmount, setGiftCardDefaultAmount] = useState<number | null>(null);
  const [giftCardSourceProduct, setGiftCardSourceProduct] = useState<any | null>(null);

  // Discount state
  const [appliedDiscounts, setAppliedDiscounts] = useState([]);
  const [giftCardDiscount, setGiftCardDiscount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState<{amount: number, name?: string}>({amount: 0});
  const [autoDiscounts, setAutoDiscounts] = useState([]);

  // Draft state
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Ref to hold the add product handler for barcode scanner
  const addProductRef = useRef<(product: any) => void>(() => {});

  const normalizePriceCents = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return value >= 1000 ? Math.round(value) : dollarsToCents(value);
  };

  const refreshLocalDrafts = useCallback(() => {
    setLocalDrafts(getLocalDrafts());
  }, []);

  const showDraftToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setDraftToast({ message, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setDraftToast(null);
    }, 3000);
  }, []);

  // Check for automatic discounts when cart changes
  const checkAutomaticDiscounts = async (currentCartItems) => {
    try {
      const cartItemsForAPI = currentCartItems
        .filter((item) => !item?.giftCard)
        .map(item => ({
        id: item.id,
        categoryId: item.categoryId,
        categoryIds: item.categoryIds || (item.categoryId ? [item.categoryId] : []),
        quantity: item.quantity,
        price: item.customPrice ?? item.price ?? item.unitPrice ?? 0
      }));
      
      console.log('🔍 Sending cart items to auto-discount API:', cartItemsForAPI);
      
      const response = await apiClient.post('/api/discounts/auto-apply', {
        cartItems: cartItemsForAPI,
        source: 'POS'
      });

      if (response.status >= 200 && response.status < 300) {
        const result = response.data || {};
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
      if (isGiftCardProduct(product)) {
        const giftCardInfo = getGiftCardInfo(product);
        let defaultAmountCents: number | null = null;
        if (giftCardInfo.value) {
          defaultAmountCents = dollarsToCents(giftCardInfo.value);
        } else if (typeof product.defaultPrice === 'number' && product.defaultPrice > 0) {
          defaultAmountCents = dollarsToCents(product.defaultPrice);
        }

        setGiftCardSourceProduct(product);
        setGiftCardModalMode('electronic');
        setGiftCardCardNumber(undefined);
        setGiftCardDefaultAmount(defaultAmountCents);
        setShowGiftCardModal(true);
        return;
      }

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

  // Keep ref updated for barcode scanner
  addProductRef.current = handleAddProduct;

  // Barcode scanner - only active when not in payment/delivery mode
  useBarcodeScanner({
    enabled: !showPaymentController && !showDeliveryOrder && !showGiftCardModal,
    onProductFound: (product) => {
      setScannerError(null);
      addProductRef.current(product);
    },
    onCodeScanned: (code) => {
      if (!isGiftCardNumber(code)) return false;
      const type = getGiftCardNumberType(code);
      if (type !== 'PHYSICAL') return false;

      setScannerError(null);
      setGiftCardSourceProduct(null);
      setGiftCardModalMode('physical');
      setGiftCardCardNumber(code);
      setGiftCardDefaultAmount(null);
      setShowGiftCardModal(true);
      return true;
    },
    onError: (error) => {
      setScannerError(error);
      setTimeout(() => setScannerError(null), 3000);
    },
  });

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

  const handleGiftCardAdd = (payload: GiftCardSaleData) => {
    const existing = cartItems.find((item) => item?.giftCard?.cardNumber === payload.cardNumber);
    if (existing) {
      setScannerError('Gift card already added to the cart.');
      setTimeout(() => setScannerError(null), 3000);
      return;
    }

    const label = payload.type === 'DIGITAL' ? 'Digital Gift Card' : 'Gift Card';
    const newItem = {
      id: `gift-card-${payload.cardNumber}`,
      name: `${label} - ${payload.cardNumber}`,
      price: payload.amount,
      quantity: 1,
      isTaxable: false,
      giftCard: payload,
      categoryId: giftCardSourceProduct?.categoryId,
      categoryIds: giftCardSourceProduct?.categoryIds,
      productId: giftCardSourceProduct?.id,
    };

    const updatedCartItems = [...cartItems, newItem];
    setCartItems(updatedCartItems);
    checkAutomaticDiscounts(updatedCartItems);
    setGiftCardSourceProduct(null);
  };

  const handleGiftCardClose = () => {
    setShowGiftCardModal(false);
    setGiftCardSourceProduct(null);
    setGiftCardCardNumber(undefined);
    setGiftCardDefaultAmount(null);
  };

  useEffect(() => {
    const drafts = getLocalDrafts();
    if (drafts.length !== 1) return;

    const [draft] = drafts;
    const savedAt = new Date(draft.savedAt).getTime();
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > AUTO_RESTORE_WINDOW_MS) {
      return;
    }

    setCartItems(draft.items || []);
    setSelectedCustomer(draft.customer || null);
    setAppliedDiscounts(draft.discounts || []);
    setGiftCardDiscount(draft.giftCardDiscount || 0);
    setCouponDiscount(draft.couponDiscount || { amount: 0 });
    setAutoDiscounts([]);
    setCartSessionId(draft.id);
    deleteLocalDraft(draft.id);
    checkAutomaticDiscounts(draft.items || []);
  }, []);

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
      deleteLocalDraft(cartSessionId);
      setCartSessionId(generateUUID());
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
      setCartSessionId(generateUUID());
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
      showDraftToast('Cart is empty, nothing to save as draft', 'error');
      return;
    }

    try {
      let customerId = selectedCustomer?.id;
      if (!customerId) {
        customerId = await getOrCreateGuestCustomer();
      }

      const orderData = {
        customerId,
        orders: [
          {
            orderType: 'PICKUP',
            deliveryFee: 0,
            cardMessage: '',
            deliveryInstructions: 'POS draft order',
            deliveryDate: null,
            deliveryTime: null,
            customProducts: cartItems.map((item) => ({
              description: item.name || item.customName || 'POS Item',
              price: centsToDollars(item.customPrice ?? item.price ?? 0).toFixed(2),
              qty: String(item.quantity ?? 1),
              tax: item.isTaxable ?? true,
            })),
          },
        ],
      };

      const response = await apiClient.post('/api/orders/save-draft', orderData);
      if (response.status < 200 || response.status >= 300 || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to save draft');
      }

      const savedDraft = response.data?.drafts?.[0];
      const draftNumber = savedDraft?.orderNumber ?? savedDraft?.id ?? 'Draft';
      showDraftToast(`Saved as Draft #${draftNumber}`);

      deleteLocalDraft(cartSessionId);
      setCartSessionId(generateUUID());

      // Clear cart after saving
      setCartItems([]);
      setAppliedDiscounts([]);
      setGiftCardDiscount(0);
      setCouponDiscount({amount: 0});
      setAutoDiscounts([]);
      setSelectedCustomer(null);
      if (showDraftModal) {
        refreshLocalDrafts();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      showDraftToast('Failed to save draft. Please try again.', 'error');
    }
  };

  const handleLoadDrafts = () => {
    refreshLocalDrafts();
    setShowDraftModal(true);
  };

  const handleLoadDraft = async (order) => {
    try {
      console.log('Loading draft order:', order);
      
      // Convert order items back to cart format
      const draftCartItems = (order.orderItems || []).map((item, index) => ({
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
      } else {
        setSelectedCustomer(null);
      }

      // Load items into cart
      setCartItems(draftCartItems);
      setAppliedDiscounts([]);
      setGiftCardDiscount(0);
      setCouponDiscount({ amount: 0 });
      setAutoDiscounts([]);
      setCartSessionId(generateUUID());

      checkAutomaticDiscounts(draftCartItems);
      
      // Close modal
      setShowDraftModal(false);
      
      console.log(`✅ Loaded draft order #${order.orderNumber} with ${draftCartItems.length} items`);
    } catch (error) {
      console.error('Error loading draft:', error);
      showDraftToast('Failed to load draft. Please try again.', 'error');
    }
  };

  const handleLoadLocalDraft = (draft: LocalDraft) => {
    setCartItems(draft.items || []);
    setSelectedCustomer(draft.customer || null);
    setAppliedDiscounts(draft.discounts || []);
    setGiftCardDiscount(draft.giftCardDiscount || 0);
    setCouponDiscount(draft.couponDiscount || { amount: 0 });
    setAutoDiscounts([]);
    setCartSessionId(draft.id);
    deleteLocalDraft(draft.id);
    checkAutomaticDiscounts(draft.items || []);
    setShowDraftModal(false);
    refreshLocalDrafts();
  };

  const handleDeleteLocalDraft = (draftId: string) => {
    deleteLocalDraft(draftId);
    refreshLocalDrafts();
  };

  useEffect(() => {
    if (showDraftModal) {
      refreshLocalDrafts();
    }
  }, [showDraftModal, refreshLocalDrafts]);

  // Calculate total with discounts and tax
  const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
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

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (cartItems.length > 0) {
        saveLocalDraft({
          id: cartSessionId,
          items: cartItems,
          customer: selectedCustomer,
          discounts: appliedDiscounts,
          giftCardDiscount,
          couponDiscount,
          savedAt: new Date().toISOString(),
          itemCount,
          totalCents: calculatedTotal,
        });
      } else {
        deleteLocalDraft(cartSessionId);
      }

      if (showDraftModal) {
        refreshLocalDrafts();
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    cartItems,
    selectedCustomer,
    appliedDiscounts,
    giftCardDiscount,
    couponDiscount,
    cartSessionId,
    itemCount,
    calculatedTotal,
    showDraftModal,
    refreshLocalDrafts,
  ]);

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
      {draftToast && (
        <div
          className={`fixed right-6 top-6 z-[120] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            draftToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {draftToast.message}
        </div>
      )}
      {scannerError && (
        <div className="fixed left-1/2 top-6 z-[120] -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {scannerError}
        </div>
      )}
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

      <GiftCardSaleModal
        open={showGiftCardModal}
        mode={giftCardModalMode}
        initialCardNumber={giftCardCardNumber}
        defaultAmountCents={giftCardDefaultAmount}
        onClose={handleGiftCardClose}
        onAdd={handleGiftCardAdd}
      />

      {/* Draft Modal */}
      <DraftModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        localDrafts={localDrafts}
        onLoadLocalDraft={handleLoadLocalDraft}
        onDeleteLocalDraft={handleDeleteLocalDraft}
        onLoadDraft={handleLoadDraft}
        onNotify={showDraftToast}
      />
    </POSLayout>
  );
}

type DraftModalProps = {
  isOpen: boolean;
  onClose: () => void;
  localDrafts: LocalDraft[];
  onLoadLocalDraft: (draft: LocalDraft) => void;
  onDeleteLocalDraft: (draftId: string) => void;
  onLoadDraft: (order: any) => void;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
};

function DraftModal({
  isOpen,
  onClose,
  localDrafts,
  onLoadLocalDraft,
  onDeleteLocalDraft,
  onLoadDraft,
  onNotify,
}: DraftModalProps) {
  const apiClient = useApiClient();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDrafts = async () => {
      try {
        const response = await apiClient.get('/api/orders/list?status=DRAFT&limit=20');
        if (!isMounted) return;

        if (response.status >= 200 && response.status < 300) {
          setDrafts(response.data?.data || response.data?.orders || []);
        } else {
          setError('Failed to load saved drafts.');
          setDrafts([]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching drafts:', error);
        setError('Failed to load saved drafts.');
        setDrafts([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDrafts();

    return () => {
      isMounted = false;
    };
  }, [apiClient, isOpen]);

  const sortedLocalDrafts = [...localDrafts].sort((a, b) => {
    const timeA = new Date(a.savedAt).getTime();
    const timeB = new Date(b.savedAt).getTime();
    const safeA = Number.isFinite(timeA) ? timeA : 0;
    const safeB = Number.isFinite(timeB) ? timeB : 0;
    return safeB - safeA;
  });

  const getDraftItemCount = (draft: LocalDraft) => {
    if (Number.isFinite(draft.itemCount)) return draft.itemCount;
    if (Array.isArray(draft.items)) {
      return draft.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    }
    return 0;
  };

  const getDraftTotal = (draft: LocalDraft) => {
    if (Number.isFinite(draft.totalCents)) return draft.totalCents;
    if (Array.isArray(draft.items)) {
      return draft.items.reduce((sum, item) => {
        const price = item.customPrice ?? item.price ?? 0;
        return sum + price * (item.quantity ?? 1);
      }, 0);
    }
    return 0;
  };

  const handleDeleteDbDraft = async (draftId: string) => {
    try {
      setDeletingId(draftId);
      const response = await apiClient.delete(`/api/orders/${draftId}/draft`);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.error || 'Failed to delete draft');
      }
      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      onNotify?.('Draft deleted');
    } catch (error) {
      console.error('Error deleting draft:', error);
      setError('Failed to delete draft.');
      onNotify?.('Failed to delete draft.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full">
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Load Draft</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Auto-saved carts stay on this device. Saved drafts are stored in the database.
        </p>

        <div className="mt-6 max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Local Drafts (auto-saved)
            </div>
            {sortedLocalDrafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No local drafts found.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedLocalDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <button
                      onClick={() => onLoadLocalDraft(draft)}
                      className="flex-1 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {getDraftItemCount(draft)} items • {formatCurrency(getDraftTotal(draft))}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getCustomerLabel(draft.customer)} • {formatRelativeTime(draft.savedAt)}
                      </div>
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteLocalDraft(draft.id);
                      }}
                      className="mr-2 mt-2 h-9 w-9 rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                      aria-label="Delete local draft"
                    >
                      <svg className="mx-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Saved Drafts (database)
            </div>
            {loading ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Loading drafts...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No saved drafts found.
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <button
                      onClick={() => onLoadDraft(draft)}
                      className="flex-1 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            Draft #{draft.orderNumber ?? draft.id}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {draft.customer
                              ? `${draft.customer.firstName} ${draft.customer.lastName}`
                              : 'No customer'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {draft.createdAt ? formatDraftDate(draft.createdAt) : ''}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteDbDraft(draft.id);
                      }}
                      disabled={deletingId === draft.id}
                      className="mr-2 mt-2 h-9 w-9 rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                      aria-label="Delete saved draft"
                    >
                      <svg className="mx-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
