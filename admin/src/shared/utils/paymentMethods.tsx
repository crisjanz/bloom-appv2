// src/config/paymentMethods.ts - Centralized payment methods configuration
import React from 'react';
import {
  DollarLineIcon,
  CreditCardIcon,
  BoltIcon,
  TruckIcon,
} from '@shared/assets/icons';

export type PaymentMethodPlatform = 'pos' | 'admin' | 'website';

export interface PaymentMethodConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  availableIn: PaymentMethodPlatform[];
  description?: string;
  isCustom?: boolean;
  sortOrder: number;
  offlineId?: string;
  meta?: Record<string, any>;
}

export interface GetPaymentMethodsOptions {
  builtIn?: {
    cod?: boolean;
    houseAccount?: boolean;
    check?: boolean;
  };
  offlineMethods?: Array<{
    id: string;
    name: string;
    description?: string | null;
    instructions?: string | null;
    isActive: boolean;
    visibleOnPos: boolean;
    visibleOnTakeOrder: boolean;
    sortOrder: number;
    requiresReference: boolean;
    allowChangeTracking: boolean;
  }>;
}

export const paymentMethods: PaymentMethodConfig[] = [
  {
    id: "cash",
    label: "Cash",
    icon: <DollarLineIcon className="w-6 h-6 text-green-600" />,
    enabled: true,
    availableIn: ["pos", "admin"],
    description: "Cash payment (in-person only)",
    sortOrder: 1,
  },
  {
    id: "credit",
    label: "Credit Card",
    icon: <CreditCardIcon className="w-6 h-6 text-purple-600" />,
    enabled: true,
    availableIn: ["pos", "admin", "website"],
    description: "Credit card payment",
    sortOrder: 2,
  },
  {
    id: "debit",
    label: "Debit Card", 
    icon: <CreditCardIcon className="w-6 h-6 text-blue-600" />,
    enabled: false,
    availableIn: ["pos", "admin"],
    description: "Debit card payment (in-person only)",
    sortOrder: 3,
  },
  {
    id: "split",
    label: "Split Payment",
    icon: <BoltIcon className="w-6 h-6 text-red-500" />,
    enabled: true,
    availableIn: ["pos", "admin"],
    description: "Multiple payment methods",
    sortOrder: 4,
  },
  {
    id: "cod",
    label: "COD",
    icon: <TruckIcon className="w-6 h-6 text-orange-600" />,
    enabled: false,
    availableIn: ["pos", "admin", "website"],
    description: "Cash on delivery",
    sortOrder: 5,
  },
  {
    id: "house_account",
    label: "House Account",
    icon: <CreditCardIcon className="w-6 h-6 text-blue-600" />,
    enabled: false,
    availableIn: ["pos", "admin"],
    description: "Charge to customer account",
    sortOrder: 6,
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: <CreditCardIcon className="w-6 h-6 text-indigo-600" />,
    enabled: false,
    availableIn: ["admin", "website"],
    description: "PayPal online payment",
    sortOrder: 7,
  },
  {
    id: "check",
    label: "Check",
    icon: <DollarLineIcon className="w-6 h-6 text-gray-600" />,
    enabled: true,
    availableIn: ["pos", "admin"],
    description: "Check payment",
    sortOrder: 8,
  },
  {
    id: "wire",
    label: "Wire Transfer",
    icon: <CreditCardIcon className="w-6 h-6 text-teal-600" />,
    enabled: false,
    availableIn: ["admin", "website"],
    description: "Bank wire transfer",
    sortOrder: 9,
  },
  {
    id: "offline",
    label: "Offline Payment",
    icon: <DollarLineIcon className="w-6 h-6 text-gray-600" />,
    enabled: false,
    availableIn: ["admin"],
    description: "Payment processed offline",
    sortOrder: 10,
  },
  {
    id: "other_methods",
    label: "Other Methods",
    icon: <DollarLineIcon className="w-6 h-6 text-gray-600" />,
    enabled: true,
    availableIn: ["admin"],
    description: "COD, House Account, PayPal, Wire Transfer, Offline Payment",
    sortOrder: 11,
  },
  {
    id: "send_to_pos",
    label: "Send to POS",
    icon: <TruckIcon className="w-6 h-6 text-blue-600" />,
    enabled: true,
    availableIn: ["admin"],
    description: "Transfer order to POS for payment",
    sortOrder: 12,
  }
];

// Helper functions
export const getPaymentMethods = (platform: PaymentMethodPlatform): PaymentMethodConfig[] => {
  return getPaymentMethodsWithOptions(platform, {});
};

export const getPaymentMethodsWithOptions = (
  platform: PaymentMethodPlatform,
  options: GetPaymentMethodsOptions
): PaymentMethodConfig[] => {
  const { builtIn, offlineMethods } = options;

  const base = paymentMethods
    .map((method) => {
      let enabled = method.enabled;

      if (builtIn) {
        if (method.id === 'cod' && typeof builtIn.cod === 'boolean') {
          enabled = builtIn.cod;
        }
        if (method.id === 'house_account' && typeof builtIn.houseAccount === 'boolean') {
          enabled = builtIn.houseAccount;
        }
        if (method.id === 'check' && typeof builtIn.check === 'boolean') {
          enabled = builtIn.check;
        }
      }

      return {
        ...method,
        enabled,
      };
    })
    .filter((method) => method.enabled && method.availableIn.includes(platform));

  const offlineConfigs: PaymentMethodConfig[] = (offlineMethods ?? [])
    .filter((method) => {
      if (!method.isActive) return false;
      if (platform === 'pos') return method.visibleOnPos;
      if (platform === 'admin') return method.visibleOnTakeOrder || method.visibleOnPos;
      if (platform === 'website') return method.visibleOnTakeOrder; // website aligns with take order for now
      return false;
    })
    .map((method) => ({
      id: `offline:${method.id}`,
      label: method.name,
      icon: <DollarLineIcon className="w-6 h-6 text-gray-600" />,
      enabled: true,
      availableIn: ['pos', 'admin'],
      description: method.description ?? undefined,
      isCustom: true,
      sortOrder: 100 + method.sortOrder,
      offlineId: method.id,
      meta: {
        requiresReference: method.requiresReference,
        allowChangeTracking: method.allowChangeTracking,
        instructions: method.instructions ?? undefined,
      }
    }));

  return [...base, ...offlineConfigs].sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getPaymentMethodById = (id: string): PaymentMethodConfig | undefined => {
  return paymentMethods.find(method => method.id === id);
};

export const getEnabledPaymentMethods = (): PaymentMethodConfig[] => {
  return paymentMethods.filter(method => method.enabled);
};

// Legacy mapping for backward compatibility
export const legacyPaymentMethodMap: Record<string, string> = {
  "Cash": "cash",
  "Debit": "debit", 
  "Credit - Stripe": "credit",
  "Credit - Square": "credit",
  "Check": "check",
  "PayPal": "paypal",
  "House Account": "house_account",
  "COD": "cod",
  "Wire": "wire",
  "Pay in POS": "offline",
  "Offline Payment": "offline",
};

export const getLegacyPaymentMethods = () => {
  return [
    { value: "Cash", label: "Cash" },
    { value: "Debit", label: "Debit" },
    { value: "Credit - Stripe", label: "Credit - Stripe" },
    { value: "Credit - Square", label: "Credit - Square" },
    { value: "Check", label: "Check" },
    { value: "PayPal", label: "PayPal" },
    { value: "House Account", label: "House Account" },
    { value: "COD", label: "COD" },
    { value: "Wire", label: "Wire" },
    { value: "Pay in POS", label: "Pay in POS" },
  ];
};
