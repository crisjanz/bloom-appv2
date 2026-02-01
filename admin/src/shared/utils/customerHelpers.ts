/**
 * Customer Utilities
 *
 * Centralized customer helper functions
 *
 * CRITICAL BUG FIX: Guest customer creation
 * - Old code created a new "Walk-in Customer" record every single transaction
 * - This polluted the database with duplicate guest customers
 * - New code uses a single shared guest customer ID
 */

// Shared guest customer ID (will be set on first creation)
let GUEST_CUSTOMER_ID: string | null = null;

/**
 * Get or create a shared guest customer
 * This prevents database pollution from creating duplicate "Walk-in Customer" records
 *
 * @returns Guest customer ID
 */
export const getOrCreateGuestCustomer = async (): Promise<string> => {
  // If we already have a guest customer ID in memory, use it
  if (GUEST_CUSTOMER_ID) {
    return GUEST_CUSTOMER_ID;
  }

  try {
    const response = await fetch('/api/customers/guest');

    if (!response.ok) {
      throw new Error('Failed to get guest customer');
    }

    const guest = await response.json();
    GUEST_CUSTOMER_ID = guest.id;

    return GUEST_CUSTOMER_ID;
  } catch (error) {
    console.error('❌ Error getting/creating guest customer:', error);
    throw new Error('Failed to get guest customer');
  }
};

/**
 * Reset the cached guest customer ID
 * (Useful for testing or if guest customer is deleted)
 */
export const resetGuestCustomerId = (): void => {
  GUEST_CUSTOMER_ID = null;
};

/**
 * Check if a customer is a guest customer
 * @param customer - Customer object
 * @returns True if customer is a guest
 */
export const isGuestCustomer = (customer: { firstName?: string | null; lastName?: string | null }): boolean => {
  return customer.firstName === 'Walk-in' && customer.lastName === 'Customer';
};

/**
 * Get customer display name
 * @param customer - Customer object
 * @param fallback - Fallback name (default: 'Walk-in Customer')
 * @returns Display name
 */
export const getCustomerDisplayName = (
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null,
  fallback: string = 'Walk-in Customer'
): string => {
  if (!customer) return fallback;

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
};

/**
 * Validate customer has required fields
 * @param customer - Customer object
 * @returns Validation errors array (empty if valid)
 */
export const validateCustomer = (customer: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}): string[] => {
  const errors: string[] = [];

  if (!customer.firstName && !customer.lastName) {
    errors.push('Customer must have a first name or last name');
  }

  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Invalid email format');
  }

  if (customer.phone && !isValidPhone(customer.phone)) {
    errors.push('Invalid phone number format');
  }

  return errors;
};

/**
 * Simple email validation
 * @param email - Email string
 * @returns True if valid email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Simple phone validation (allows various formats)
 * @param phone - Phone string
 * @returns True if valid phone format
 */
const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  // Valid if 10 or 11 digits (with optional country code)
  return digitsOnly.length >= 10 && digitsOnly.length <= 11;
};
