import { useMemo } from 'react';

type OrderEntry = {
  customProducts: {
    description: string;
    category: string;
    price: string;
    qty: string;
    tax: boolean;
  }[];
};

export const usePaymentCalculations = (
  orders: OrderEntry[],
  deliveryCharge: number,
  discount: number,
  discountType: '$' | '%'
) => {
  const itemTotal = useMemo(() => {
    return orders.reduce((total, order) => {
      const subtotal = order.customProducts.reduce((sum, item) => {
        return sum + parseFloat(item.price || "0") * parseInt(item.qty || "0");
      }, 0);
      return total + subtotal;
    }, 0);
  }, [orders]);

  const calculateDiscountAmount = useMemo(() => {
    return discountType === "%" ? itemTotal * (discount / 100) : discount;
  }, [discount, discountType, itemTotal]);

  const subtotal = useMemo(() => {
    return itemTotal + deliveryCharge - calculateDiscountAmount;
  }, [itemTotal, deliveryCharge, calculateDiscountAmount]);

  // 🔥 NEW: Only tax items that have tax=true
  const taxableAmount = useMemo(() => {
    return orders.reduce((total, order) => {
      const taxableSubtotal = order.customProducts.reduce((sum, item) => {
        if (item.tax) {
          return sum + parseFloat(item.price || "0") * parseInt(item.qty || "0");
        }
        return sum;
      }, 0);
      return total + taxableSubtotal;
    }, 0);
  }, [orders]);

  // Apply discount proportionally to taxable amount
  const discountOnTaxable = useMemo(() => {
    if (itemTotal === 0) return 0;
    return calculateDiscountAmount * (taxableAmount / itemTotal);
  }, [calculateDiscountAmount, taxableAmount, itemTotal]);

  const adjustedTaxableAmount = taxableAmount - discountOnTaxable;
  
  // 🔥 FIXED: Tax only applies to taxable items
  const gst = useMemo(() => adjustedTaxableAmount * 0.05, [adjustedTaxableAmount]);
  const pst = useMemo(() => adjustedTaxableAmount * 0.07, [adjustedTaxableAmount]);
  const grandTotal = useMemo(() => subtotal + gst + pst, [subtotal, gst, pst]);

  return {
    itemTotal,
    subtotal,
    gst,
    pst,
    grandTotal,
    calculateDiscountAmount
  };
};