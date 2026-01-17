import { PrismaClient, PaymentProvider, PaymentProviderMode } from '@prisma/client';
import { encryptSecret, hasConfiguredEncryptionKey } from '../utils/crypto';

const prisma = new PrismaClient();
const PAYMENT_SETTINGS_SINGLETON_ID = 'payment_settings_singleton';

export interface ProviderConfigResponse {
  enabled: boolean;
  mode: PaymentProviderMode;
  publicKey?: string | null;
  terminalId?: string | null;
  accountId?: string | null;
  appId?: string | null;
  locationId?: string | null;
  hasSecret: boolean;
  environment?: string | null;
  clientId?: string | null;
}

export interface PaymentSettingsResponse {
  defaultCardProvider: PaymentProvider | null;
  allowSplitPayments: boolean;
  allowOfflineNotes: boolean;
  encryptionConfigured: boolean;
  builtInMethods: {
    cod: boolean;
    houseAccount: boolean;
    check: boolean;
  };
  providers: {
    stripe: ProviderConfigResponse;
    square: ProviderConfigResponse;
    paypal: ProviderConfigResponse;
  };
}

export interface ProviderUpdatePayload {
  enabled?: boolean;
  mode?: string;
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
  defaultCardProvider?: string | null;
  allowSplitPayments?: boolean;
  allowOfflineNotes?: boolean;
}

export interface BuiltInMethodsPayload {
  codEnabled?: boolean;
  houseAccountEnabled?: boolean;
  checkEnabled?: boolean;
}

export interface OfflineMethodPayload {
  name?: string;
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

function normalizeCode(source: string | undefined | null, explicitCode?: string | null): string {
  const base = (explicitCode ?? source ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || `method-${Date.now()}`;
}

function parseProvider(provider: string): PaymentProvider {
  const normalized = provider.trim().toUpperCase();
  if (Object.values(PaymentProvider).includes(normalized as PaymentProvider)) {
    return normalized as PaymentProvider;
  }

  throw new Error(`Unsupported payment provider "${provider}"`);
}

function parseMode(mode?: string | null): PaymentProviderMode {
  if (!mode) {
    return PaymentProviderMode.TERMINAL;
  }

  const normalized = mode.trim().toUpperCase();
  switch (normalized) {
    case 'TERMINAL':
    case 'MANUAL':
    case 'HYBRID':
      return normalized as PaymentProviderMode;
    default:
      throw new Error(`Invalid provider mode "${mode}"`);
  }
}

async function getOrCreateSettings() {
  const existing = await prisma.paymentSettings.findFirst();
  if (existing) {
    return existing;
  }

  return prisma.paymentSettings.create({
    data: { id: PAYMENT_SETTINGS_SINGLETON_ID },
  });
}

/**
 * Get the raw PaymentSettings record from database
 * Used by payment provider factory to access encrypted secrets
 */
export async function getSettingsRecord() {
  return getOrCreateSettings();
}

export async function fetchPaymentSettings(): Promise<PaymentSettingsResponse> {
  const settings = await getOrCreateSettings();

  return fetchPaymentSettingsFromRecord(settings);
}

export async function updateGeneralPaymentSettings(payload: GeneralSettingsPayload) {
  const settings = await getOrCreateSettings();

  const data: any = {};

  if (payload.defaultCardProvider !== undefined) {
    data.defaultCardProvider =
      payload.defaultCardProvider === null
        ? null
        : parseProvider(payload.defaultCardProvider);
  }

  if (typeof payload.allowSplitPayments === 'boolean') {
    data.allowSplitPayments = payload.allowSplitPayments;
  }

  if (typeof payload.allowOfflineNotes === 'boolean') {
    data.allowOfflineNotes = payload.allowOfflineNotes;
  }

  const updated = await prisma.paymentSettings.update({
    where: { id: settings.id },
    data,
  });

  return fetchPaymentSettingsFromRecord(updated);
}

export async function updateBuiltInPaymentMethods(payload: BuiltInMethodsPayload) {
  const settings = await getOrCreateSettings();

  const data: any = {};

  if (typeof payload.codEnabled === 'boolean') {
    data.codEnabled = payload.codEnabled;
  }
  if (typeof payload.houseAccountEnabled === 'boolean') {
    data.houseAccountEnabled = payload.houseAccountEnabled;
  }
  if (typeof payload.checkEnabled === 'boolean') {
    data.checkEnabled = payload.checkEnabled;
  }

  const updated = await prisma.paymentSettings.update({
    where: { id: settings.id },
    data,
  });

  return fetchPaymentSettingsFromRecord(updated);
}

export async function updateProviderSettings(providerKey: string, payload: ProviderUpdatePayload) {
  const settings = await getOrCreateSettings();
  const provider = parseProvider(providerKey);

  const data: any = {};

  if (typeof payload.enabled === 'boolean') {
    switch (provider) {
      case PaymentProvider.STRIPE:
        data.stripeEnabled = payload.enabled;
        break;
      case PaymentProvider.SQUARE:
        data.squareEnabled = payload.enabled;
        break;
      case PaymentProvider.PAYPAL:
        data.paypalEnabled = payload.enabled;
        break;
      default:
        break;
    }
  }

  if (payload.mode !== undefined) {
    const mode = parseMode(payload.mode);
    switch (provider) {
      case PaymentProvider.STRIPE:
        data.stripeMode = mode;
        break;
      case PaymentProvider.SQUARE:
        data.squareMode = mode;
        break;
      default:
        break;
    }
  }

  if (payload.publicKey !== undefined) {
    if (provider === PaymentProvider.STRIPE) {
      data.stripePublicKey = payload.publicKey || null;
    }
  }

  if (payload.appId !== undefined && provider === PaymentProvider.SQUARE) {
    data.squareAppId = payload.appId || null;
  }

  if (payload.locationId !== undefined && provider === PaymentProvider.SQUARE) {
    data.squareLocationId = payload.locationId || null;
  }

  if (payload.terminalId !== undefined) {
    switch (provider) {
      case PaymentProvider.STRIPE:
        data.stripeTerminalId = payload.terminalId || null;
        break;
      case PaymentProvider.SQUARE:
        data.squareTerminalId = payload.terminalId || null;
        break;
      default:
        break;
    }
  }

  if (payload.accountId !== undefined && provider === PaymentProvider.STRIPE) {
    data.stripeAccountId = payload.accountId || null;
  }

  if (payload.environment !== undefined && provider === PaymentProvider.PAYPAL) {
    data.paypalEnvironment = payload.environment || null;
  }

  if (payload.clientId !== undefined && provider === PaymentProvider.PAYPAL) {
    data.paypalClientId = payload.clientId || null;
  }

  if (payload.secretKey !== undefined) {
    const secret = payload.secretKey?.trim();
    let encrypted: string | null = null;
    if (secret) {
      try {
        encrypted = encryptSecret(secret);
      } catch (error) {
        throw new Error(
          'Unable to encrypt credential. Ensure CONFIG_ENCRYPTION_KEY is configured on the server.'
        );
      }
    }

    switch (provider) {
      case PaymentProvider.STRIPE:
        data.stripeSecretKey = encrypted;
        break;
      case PaymentProvider.SQUARE:
        data.squareAccessToken = encrypted;
        break;
      case PaymentProvider.PAYPAL:
        data.paypalClientSecret = encrypted;
        break;
      default:
        break;
    }
  }

  const updated = await prisma.paymentSettings.update({
    where: { id: settings.id },
    data,
  });

  return fetchPaymentSettingsFromRecord(updated);
}

export async function listOfflinePaymentMethods() {
  return prisma.offlinePaymentMethod.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

export async function createOfflinePaymentMethod(payload: OfflineMethodPayload) {
  if (!payload.name) {
    throw new Error('Offline payment method name is required');
  }

  const code = normalizeCode(payload.name, payload.code);

  const maxOrder = await prisma.offlinePaymentMethod.aggregate({
    _max: { sortOrder: true },
  });

  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  return prisma.offlinePaymentMethod.create({
    data: {
      name: payload.name,
      code,
      description: payload.description ?? null,
      instructions: payload.instructions ?? null,
      isActive: payload.isActive ?? true,
      visibleOnPos: payload.visibleOnPos ?? true,
      visibleOnTakeOrder: payload.visibleOnTakeOrder ?? true,
      requiresReference: payload.requiresReference ?? false,
      allowChangeTracking: payload.allowChangeTracking ?? false,
      sortOrder,
    },
  });
}

export async function updateOfflinePaymentMethod(id: string, payload: OfflineMethodPayload) {
  const existing = await prisma.offlinePaymentMethod.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Offline payment method not found');
  }

  const data: any = {};

  if (payload.name !== undefined) {
    data.name = payload.name;
  }

  if (payload.code !== undefined) {
    const baseName = payload.name ?? existing.name;
    const codeSource = payload.code?.trim() ? payload.code : baseName;
    data.code = normalizeCode(baseName, codeSource);
  }

  if (payload.description !== undefined) {
    data.description = payload.description ?? null;
  }

  if (payload.instructions !== undefined) {
    data.instructions = payload.instructions ?? null;
  }

  if (typeof payload.isActive === 'boolean') {
    data.isActive = payload.isActive;
  }

  if (typeof payload.visibleOnPos === 'boolean') {
    data.visibleOnPos = payload.visibleOnPos;
  }

  if (typeof payload.visibleOnTakeOrder === 'boolean') {
    data.visibleOnTakeOrder = payload.visibleOnTakeOrder;
  }

  if (typeof payload.requiresReference === 'boolean') {
    data.requiresReference = payload.requiresReference;
  }

  if (typeof payload.allowChangeTracking === 'boolean') {
    data.allowChangeTracking = payload.allowChangeTracking;
  }

  if (typeof payload.sortOrder === 'number') {
    data.sortOrder = payload.sortOrder;
  }

  return prisma.offlinePaymentMethod.update({
    where: { id },
    data,
  });
}

export async function deleteOfflinePaymentMethod(id: string) {
  return prisma.offlinePaymentMethod.delete({ where: { id } });
}

export async function reorderOfflinePaymentMethods(order: string[]) {
  const operations = order.map((id, index) =>
    prisma.offlinePaymentMethod.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(operations);

  return listOfflinePaymentMethods();
}

function fetchPaymentSettingsFromRecord(record: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  return {
    defaultCardProvider: record.defaultCardProvider ?? null,
    allowSplitPayments: record.allowSplitPayments,
    allowOfflineNotes: record.allowOfflineNotes,
    encryptionConfigured: hasConfiguredEncryptionKey(),
    builtInMethods: {
      cod: record.codEnabled,
      houseAccount: record.houseAccountEnabled,
      check: record.checkEnabled
    },
    providers: {
      stripe: {
        enabled: record.stripeEnabled,
        mode: record.stripeMode,
        publicKey: record.stripePublicKey,
        terminalId: record.stripeTerminalId,
        accountId: record.stripeAccountId,
        hasSecret: Boolean(record.stripeSecretKey),
      },
      square: {
        enabled: record.squareEnabled,
        mode: record.squareMode,
        appId: record.squareAppId,
        locationId: record.squareLocationId,
        terminalId: record.squareTerminalId,
        hasSecret: Boolean(record.squareAccessToken),
      },
      paypal: {
        enabled: record.paypalEnabled,
        mode: PaymentProviderMode.MANUAL,
        environment: record.paypalEnvironment,
        clientId: record.paypalClientId,
        hasSecret: Boolean(record.paypalClientSecret),
      },
    },
  };
}
