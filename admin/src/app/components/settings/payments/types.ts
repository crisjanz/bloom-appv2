export type PaymentProviderKey = 'STRIPE' | 'SQUARE' | 'PAYPAL';

export type PaymentProviderMode = 'TERMINAL' | 'MANUAL' | 'HYBRID';

export interface StripeProviderConfig {
  enabled: boolean;
  mode: PaymentProviderMode;
  publicKey: string | null;
  terminalId: string | null;
  accountId: string | null;
  hasSecret: boolean;
}

export interface SquareProviderConfig {
  enabled: boolean;
  mode: PaymentProviderMode;
  appId: string | null;
  locationId: string | null;
  terminalId: string | null;
  hasSecret: boolean;
}

export interface PaypalProviderConfig {
  enabled: boolean;
  mode: PaymentProviderMode;
  environment: string | null;
  clientId: string | null;
  hasSecret: boolean;
}

export interface OfflinePaymentMethod {
  id: string;
  name: string;
  code: string;
  description: string | null;
  instructions: string | null;
  isActive: boolean;
  visibleOnPos: boolean;
  visibleOnTakeOrder: boolean;
  requiresReference: boolean;
  allowChangeTracking: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSettingsResponse {
  defaultCardProvider: PaymentProviderKey | null;
  allowSplitPayments: boolean;
  allowOfflineNotes: boolean;
  encryptionConfigured: boolean;
  builtInMethods: {
    cod: boolean;
    houseAccount: boolean;
    check: boolean;
  };
  providers: {
    stripe: StripeProviderConfig;
    square: SquareProviderConfig;
    paypal: PaypalProviderConfig;
  };
}

export interface ProviderUpdatePayload {
  enabled?: boolean;
  mode?: PaymentProviderMode;
  publicKey?: string | null;
  secretKey?: string | null;
  terminalId?: string | null;
  accountId?: string | null;
  appId?: string | null;
  locationId?: string | null;
  environment?: string | null;
  clientId?: string | null;
}

export interface GeneralSettingsPayload {
  defaultCardProvider?: PaymentProviderKey | null;
  allowSplitPayments?: boolean;
  allowOfflineNotes?: boolean;
}

export interface BuiltInMethodsPayload {
  codEnabled?: boolean;
  houseAccountEnabled?: boolean;
  checkEnabled?: boolean;
}

export interface OfflineMethodInput {
  name: string;
  code?: string | null;
  description?: string | null;
  instructions?: string | null;
  isActive?: boolean;
  visibleOnPos?: boolean;
  visibleOnTakeOrder?: boolean;
  requiresReference?: boolean;
  allowChangeTracking?: boolean;
  sortOrder?: number;
}

export type PaymentsPagePayload = PaymentSettingsResponse & {
  offlineMethods: OfflinePaymentMethod[];
};
