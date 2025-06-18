import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TaxCalculation {
  totalRate: number;
  totalAmount: number;
  breakdown: Array<{
    name: string;
    rate: number;
    amount: number;
  }>;
}

/**
 * Get active tax rates from database
 * Throws error if no tax rates are configured
 */
export async function getActiveTaxRates() {
  const taxRates = await prisma.taxRate.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });

  if (taxRates.length === 0) {
    throw new Error('No active tax rates configured. Please configure tax rates in settings.');
  }

  return taxRates;
}

/**
 * Calculate tax for a given amount
 */
export async function calculateTax(amount: number): Promise<TaxCalculation> {
  const taxRates = await getActiveTaxRates();
  
  const breakdown = taxRates.map(tax => ({
    name: tax.name,
    rate: tax.rate,
    amount: Math.round(amount * (tax.rate / 100))
  }));

  const totalRate = taxRates.reduce((sum, tax) => sum + tax.rate, 0);
  const totalAmount = breakdown.reduce((sum, tax) => sum + tax.amount, 0);

  return {
    totalRate,
    totalAmount,
    breakdown
  };
}

/**
 * Calculate total tax amount (generic - works for any tax configuration)
 */
export async function calculateTotalTaxAmount(amount: number): Promise<number> {
  const taxCalculation = await calculateTax(amount);
  return taxCalculation.totalAmount;
}