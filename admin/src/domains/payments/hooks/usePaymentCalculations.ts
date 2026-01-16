// src/hooks/usePaymentCalculations.ts
import { useMemo } from 'react';
import { useTaxRates } from '@shared/hooks/useTaxRates';
import { coerceCents } from '@shared/utils/currency';

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
  deliveryChargeCents: number,
  discountAmount: number,
  discountType: '$' | '%'
) => {
  // Get centralized tax rates
  const { getGSTRate, getPSTRate, individualTaxRates } = useTaxRates();

  // Calculate base item total
  const itemTotalCents = useMemo(() => {
    return orders.reduce((total, order) => {
      const subtotal = order.customProducts.reduce((sum, item) => {
        const priceCents = coerceCents(item.price || '0');
        const qty = parseInt(item.qty || "0");
        return sum + priceCents * qty;
      }, 0);
      return total + subtotal;
    }, 0);
  }, [orders]);

  // Calculate taxable amount (only items with tax=true)
  const taxableAmountCents = useMemo(() => {
    return orders.reduce((total, order) => {
      const taxableSubtotal = order.customProducts.reduce((sum, item) => {
        if (item.tax) {
          const priceCents = coerceCents(item.price || '0');
          const qty = parseInt(item.qty || "0");
          return sum + priceCents * qty;
        }
        return sum;
      }, 0);
      return total + taxableSubtotal;
    }, 0);
  }, [orders]);

  const discountAmountCents = useMemo(() => {
    if (discountType === '%') {
      const percent = Number.isFinite(discountAmount) ? discountAmount : 0;
      return Math.round((itemTotalCents + deliveryChargeCents) * (percent / 100));
    }
    return Math.max(0, Math.round(discountAmount));
  }, [discountAmount, discountType, itemTotalCents, deliveryChargeCents]);

  // Subtotal after discount but before tax
  const subtotalBeforeTaxCents = useMemo(() => {
    return Math.max(0, itemTotalCents + deliveryChargeCents - discountAmountCents);
  }, [itemTotalCents, deliveryChargeCents, discountAmountCents]);

  // Apply discount proportionally to taxable amount
  const discountOnTaxableCents = useMemo(() => {
    if (itemTotalCents + deliveryChargeCents === 0) return 0;
    // Proportion of discount that applies to taxable items
    const taxableProportion = taxableAmountCents / (itemTotalCents + deliveryChargeCents);
    return Math.round(discountAmountCents * taxableProportion);
  }, [discountAmountCents, taxableAmountCents, itemTotalCents, deliveryChargeCents]);

  // Taxable amount after discount
  const adjustedTaxableAmountCents = useMemo(() => {
    return Math.max(0, taxableAmountCents - discountOnTaxableCents);
  }, [taxableAmountCents, discountOnTaxableCents]);
  
  // Calculate taxes on the discounted taxable amount using centralized rates
  const gstCents = useMemo(() => {
    return Math.round(adjustedTaxableAmountCents * getGSTRate());
  }, [adjustedTaxableAmountCents, getGSTRate]);
  const pstCents = useMemo(() => {
    return Math.round(adjustedTaxableAmountCents * getPSTRate());
  }, [adjustedTaxableAmountCents, getPSTRate]);
  
  // Grand total includes everything
  const grandTotalCents = useMemo(() => {
    return Math.max(0, subtotalBeforeTaxCents + gstCents + pstCents);
  }, [subtotalBeforeTaxCents, gstCents, pstCents]);

  return {
    itemTotal: itemTotalCents,
    subtotal: subtotalBeforeTaxCents,
    gst: gstCents,
    pst: pstCents,
    grandTotal: grandTotalCents,
    calculateDiscountAmount: discountAmountCents,
    // Tax rate information for display
    taxRates: individualTaxRates
  };
};
