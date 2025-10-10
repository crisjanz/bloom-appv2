import { useState, useEffect, useMemo } from 'react';

export interface TaxRate {
  id: string;
  name: string;
  rate: number; // Percentage (e.g., 5.00 for 5%)
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

export interface TaxCalculation {
  taxRates: TaxRate[];
  totalRate: number;
  totalAmount: number;
  breakdown: Array<{
    name: string;
    rate: number;
    amount: number;
  }>;
}

/**
 * Custom hook for managing tax rates and calculations
 * Provides centralized access to tax configuration throughout the app
 */
export const useTaxRates = () => {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active tax rates from API
  const fetchTaxRates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/tax-rates/active');
      if (!response.ok) {
        throw new Error('Failed to fetch tax rates');
      }
      const data = await response.json();
      setTaxRates(data.taxRates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tax rates');
      console.error('Error fetching tax rates:', err);
      // Fallback to empty rates if API fails - tax rates should be configured in settings
      setTaxRates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxRates();
  }, []);

  // Calculate total tax rate from active taxes
  const totalTaxRate = useMemo(() => {
    return taxRates
      .filter(tax => tax.isActive)
      .reduce((total, tax) => total + tax.rate, 0);
  }, [taxRates]);

  // Get individual tax rates for display (e.g., GST, PST separately)
  const individualTaxRates = useMemo(() => {
    return taxRates
      .filter(tax => tax.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [taxRates]);

  /**
   * Calculate tax amount for a given subtotal
   * @param subtotal - The amount to calculate tax on
   * @returns TaxCalculation object with breakdown
   */
  const calculateTax = (subtotal: number): TaxCalculation => {
    const activeTaxes = taxRates.filter(tax => tax.isActive);
    const breakdown = activeTaxes.map(tax => ({
      name: tax.name,
      rate: tax.rate,
      amount: parseFloat((subtotal * (tax.rate / 100)).toFixed(2))
    }));

    const totalAmount = breakdown.reduce((sum, tax) => sum + tax.amount, 0);

    return {
      taxRates: activeTaxes,
      totalRate: totalTaxRate,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      breakdown
    };
  };

  /**
   * Calculate tax for individual items (respects tax flags)
   * @param items - Array of items with price, quantity, and tax flag (supports both 'tax' and 'isTaxable' properties)
   * @returns TaxCalculation object
   */
  const calculateItemTax = (items: Array<{ price: number; quantity?: number; qty?: number; tax?: boolean; isTaxable?: boolean }>): TaxCalculation => {
    const taxableSubtotal = items.reduce((total, item) => {
      // Support both 'tax' and 'isTaxable' properties
      const isTaxable = item.tax ?? item.isTaxable ?? true; // Default to taxable
      const quantity = item.quantity ?? item.qty ?? 1; // Support both quantity properties
      
      if (isTaxable) {
        return total + (item.price * quantity);
      }
      return total;
    }, 0);

    return calculateTax(taxableSubtotal);
  };

  /**
   * Get GST rate (for backward compatibility)
   */
  const getGSTRate = (): number => {
    const gst = taxRates.find(tax => tax.isActive && tax.name.toUpperCase().includes('GST'));
    return gst ? gst.rate / 100 : 0; // No fallback - use configured rates only
  };

  /**
   * Get PST rate (for backward compatibility)
   */
  const getPSTRate = (): number => {
    const pst = taxRates.find(tax => tax.isActive && tax.name.toUpperCase().includes('PST'));
    return pst ? pst.rate / 100 : 0; // No fallback - use configured rates only
  };

  /**
   * Get combined tax rate (for backward compatibility)
   */
  const getCombinedTaxRate = (): number => {
    return totalTaxRate / 100;
  };

  /**
   * Calculate GST amount (for backward compatibility)
   */
  const calculateGST = (amount: number): number => {
    return parseFloat((amount * getGSTRate()).toFixed(2));
  };

  /**
   * Calculate PST amount (for backward compatibility)
   */
  const calculatePST = (amount: number): number => {
    return parseFloat((amount * getPSTRate()).toFixed(2));
  };

  /**
   * Calculate combined tax amount (for backward compatibility)
   */
  const calculateCombinedTax = (amount: number): number => {
    return parseFloat((amount * getCombinedTaxRate()).toFixed(2));
  };

  /**
   * Refresh tax rates from server
   */
  const refresh = () => {
    fetchTaxRates();
  };

  return {
    // Data
    taxRates,
    totalTaxRate,
    individualTaxRates,
    isLoading,
    error,

    // Modern calculation methods
    calculateTax,
    calculateItemTax,

    // Backward compatibility methods
    getGSTRate,
    getPSTRate,
    getCombinedTaxRate,
    calculateGST,
    calculatePST,
    calculateCombinedTax,

    // Utility
    refresh
  };
};