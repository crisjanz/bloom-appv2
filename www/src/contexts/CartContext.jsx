import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { validateCoupon } from '../services/discountService';

const CartContext = createContext();

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [coupon, setCoupon] = useState(null);

  // Load cart and delivery date from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('bloom_cart');
    const savedDate = localStorage.getItem('bloom_delivery_date');
    const savedCoupon = localStorage.getItem('bloom_coupon');

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }

    if (savedDate) {
      try {
        setDeliveryDate(savedDate);
      } catch (error) {
        console.error('Failed to load delivery date from localStorage:', error);
      }
    }

    if (savedCoupon) {
      try {
        const parsedCoupon = JSON.parse(savedCoupon);
        setCoupon(parsedCoupon);
      } catch (error) {
        console.error('Failed to load coupon from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bloom_cart', JSON.stringify(cart));
  }, [cart]);

  // Save delivery date to localStorage whenever it changes
  useEffect(() => {
    if (deliveryDate) {
      localStorage.setItem('bloom_delivery_date', deliveryDate);
    } else {
      localStorage.removeItem('bloom_delivery_date');
    }
  }, [deliveryDate]);

  // Save coupon whenever it changes
  useEffect(() => {
    if (coupon) {
      localStorage.setItem('bloom_coupon', JSON.stringify(coupon));
    } else {
      localStorage.removeItem('bloom_coupon');
    }
  }, [coupon]);

  const addToCart = (product, variantId = null) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.id === product.id && item.variantId === variantId
      );

      if (existingItemIndex > -1) {
        // Item exists, increase quantity
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += 1;
        return updatedCart;
      } else {
        // New item
        const baseImage = Array.isArray(product.images)
          ? product.images[0]
          : product.images;

        const variant =
          Array.isArray(product.variants) && variantId
            ? product.variants.find((v) => v.id === variantId)
            : null;

        return [
          ...prevCart,
          {
            id: product.id,
            sku: product.sku || null,
            name: product.name,
            price: Number(product.price) || 0,
            image: baseImage?.url || baseImage || '',
            variantId,
            variantName: variant?.name || null,
            quantity: 1,
            isTaxable:
              typeof product.isTaxable === 'boolean' ? product.isTaxable : true,
            categoryId: product.categoryId || product.category?.id || null,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId, variantId = null) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => !(item.id === productId && item.variantId === variantId)
      )
    );
  };

  const updateQuantity = (productId, variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDeliveryDate(null);
    setCoupon(null);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getDiscountAmount = () => {
    return coupon?.discountAmount ? Number(coupon.discountAmount) : 0;
  };

  const hasFreeShipping = () => {
    return coupon?.discount?.discountType === 'FREE_SHIPPING';
  };

  const applyCouponCode = async (code, customerId = null) => {
    const trimmedCode = code?.trim();
    if (!trimmedCode) {
      throw new Error('Enter a coupon code');
    }

    if (!cart.length) {
      throw new Error('Add items to your cart before applying a coupon');
    }

    const cartItems = cart.map((item) => ({
      id: item.id,
      price: Number(item.price),
      quantity: item.quantity,
      categoryId: item.categoryId || null,
    }));

    try {
      const result = await validateCoupon({
        code: trimmedCode,
        customerId,
        cartItems,
      });

      setCoupon({
        code: trimmedCode,
        discountAmount: Number(result.discountAmount) || 0,
        discount: result.discount,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  const clearCoupon = () => {
    setCoupon(null);
  };

  const value = {
    cart,
    deliveryDate,
    setDeliveryDate,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    coupon,
    applyCouponCode,
    clearCoupon,
    getDiscountAmount,
    hasFreeShipping,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
