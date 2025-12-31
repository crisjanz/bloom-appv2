import { useState, useEffect } from 'react';
import InputField from './input/InputField';

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
}

/**
 * Format phone number for display as (###) ###-####
 * Handles: 10-digit, 11-digit with leading 1, international with +
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return '';

  // Keep international numbers as-is
  if (phone.startsWith('+')) return phone;

  // Strip to digits only
  const digits = phone.replace(/\D/g, '');

  // Handle 11-digit number with leading 1 (country code)
  const cleanDigits = digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1)
    : digits;

  // Format as (###) ###-####
  if (cleanDigits.length === 10) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }

  // Partial formatting while typing
  if (cleanDigits.length > 6) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  }
  if (cleanDigits.length > 3) {
    return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3)}`;
  }
  if (cleanDigits.length > 0) {
    return `(${cleanDigits}`;
  }

  return '';
};

/**
 * Strip phone number to digits only for database storage
 * Handles: removes all formatting, strips leading 1 from 11-digit numbers
 */
export const stripPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Keep international numbers (with +)
  if (phone.startsWith('+')) {
    return '+' + phone.slice(1).replace(/\D/g, '');
  }

  // Strip to digits only
  const digits = phone.replace(/\D/g, '');

  // Remove leading 1 if 11 digits (North American country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }

  return digits;
};

/**
 * PhoneInput Component
 *
 * Automatically formats phone numbers as (###) ###-#### for display
 * Saves as digits only to database (strips formatting + leading 1)
 *
 * Usage:
 * <PhoneInput
 *   label="Phone"
 *   value={customer.phone}
 *   onChange={(value) => setCustomer({ ...customer, phone: value })}
 * />
 */
const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder = '(250) 301-5062',
  required = false
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Sync display value when parent value changes
  useEffect(() => {
    setDisplayValue(formatPhoneDisplay(value || ''));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Update display immediately for user feedback
    setDisplayValue(input);
  };

  const handleBlur = () => {
    // Strip to digits only and update parent
    const cleaned = stripPhoneNumber(displayValue);
    onChange(cleaned);

    // Reformat display
    setDisplayValue(formatPhoneDisplay(cleaned));

    if (onBlur) {
      onBlur();
    }
  };

  return (
    <InputField
      label={label}
      type="tel"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
    />
  );
};

export default PhoneInput;
