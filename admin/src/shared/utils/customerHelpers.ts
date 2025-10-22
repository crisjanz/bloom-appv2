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
    // First, try to find an existing guest customer
    const searchResponse = await fetch('/api/customers?search=Walk-in+Customer&limit=1');

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();

      // If we found an existing guest customer, use it
      if (searchResult.customers && searchResult.customers.length > 0) {
        const guestCustomer = searchResult.customers.find(
          (c: any) => c.firstName === 'Walk-in' && c.lastName === 'Customer'
        );

        if (guestCustomer) {
          GUEST_CUSTOMER_ID = guestCustomer.id;
          console.log('✅ Using existing guest customer:', GUEST_CUSTOMER_ID);
          return GUEST_CUSTOMER_ID;
        }
      }
    }

    // If no existing guest customer found, create one
    console.log('👤 Creating new shared guest customer...');
    const createResponse = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Walk-in',
        lastName: 'Customer',
        email: null,
        phone: null,
      }),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create guest customer');
    }

    const newGuest = await createResponse.json();
    GUEST_CUSTOMER_ID = newGuest.id;
    console.log('✅ Created shared guest customer:', GUEST_CUSTOMER_ID);

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
