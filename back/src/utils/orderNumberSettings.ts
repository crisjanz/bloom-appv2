import { PrismaClient } from '@prisma/client';

export const ORDER_NUMBER_PREFIX_PATTERN = /^[A-Za-z0-9]{0,5}$/;

type ShopSettings = Record<string, unknown>;

export function parseShopSettings(settings: unknown): ShopSettings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }

  return settings as ShopSettings;
}

export function normalizeOrderNumberPrefix(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!ORDER_NUMBER_PREFIX_PATTERN.test(trimmed)) {
    return '';
  }

  return trimmed;
}

export async function getOrderNumberPrefix(prisma: PrismaClient): Promise<string> {
  const shopProfile = await prisma.shopProfile.findFirst({
    select: { settings: true },
  });

  const settings = parseShopSettings(shopProfile?.settings);
  return normalizeOrderNumberPrefix(settings.orderNumberPrefix);
}
