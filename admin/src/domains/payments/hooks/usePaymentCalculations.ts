// src/hooks/usePaymentCalculations.ts
import { useMemo } from 'react';
import { useTaxRates } from '@shared/hooks/useTaxRates';

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
  // Get centralized tax rates
  const { calculateGST, calculatePST, individualTaxRates } = useTaxRates();
  // Calculate base item total
  const itemTotal = useMemo(() => {
    return orders.reduce((total, order) => {
      const subtotal = order.customProducts.reduce((sum, item) => {
        return sum + parseFloat(item.price || "0") * parseInt(item.qty || "0");
      }, 0);
      return total + subtotal;
    }, 0);
  }, [orders]);

  // Calculate taxable amount (only items with tax=true)
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

  // Since we're now passing in the total discount amount in dollars, we don't need to convert
  const calculateDiscountAmount = useMemo(() => {
    return discount; // Already in dollars from TakeOrderPage
  }, [discount]);

  // Subtotal after discount but before tax
  const subtotalBeforeTax = useMemo(() => {
    return Math.max(0, itemTotal + deliveryCharge - calculateDiscountAmount);
  }, [itemTotal, deliveryCharge, calculateDiscountAmount]);

  // Apply discount proportionally to taxable amount
  const discountOnTaxable = useMemo(() => {
    if (itemTotal + deliveryCharge === 0) return 0;
    // Proportion of discount that applies to taxable items
    const taxableProportion = taxableAmount / (itemTotal + deliveryCharge);
    return calculateDiscountAmount * taxableProportion;
  }, [calculateDiscountAmount, taxableAmount, itemTotal, deliveryCharge]);

  // Taxable amount after discount
  const adjustedTaxableAmount = useMemo(() => {
    return Math.max(0, taxableAmount - discountOnTaxable);
  }, [taxableAmount, discountOnTaxable]);
  
  // Calculate taxes on the discounted taxable amount using centralized rates
  const gst = useMemo(() => calculateGST(adjustedTaxableAmount), [adjustedTaxableAmount, calculateGST]);
  const pst = useMemo(() => calculatePST(adjustedTaxableAmount), [adjustedTaxableAmount, calculatePST]);
  
  // Grand total includes everything
  const grandTotal = useMemo(() => {
    return Math.max(0, subtotalBeforeTax + gst + pst);
  }, [subtotalBeforeTax, gst, pst]);

  return {
    itemTotal,
    subtotal: subtotalBeforeTax,
    gst,
    pst,
    grandTotal,
    calculateDiscountAmount,
    // Tax rate information for display
    taxRates: individualTaxRates
  };
};