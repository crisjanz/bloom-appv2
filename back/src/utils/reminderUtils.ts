import prisma from '../lib/prisma';
import { generateReminderUnsubscribeToken, type ReminderUnsubscribeKind } from './reminderTokens';

const OCCASION_LABELS: Record<string, string> = {
  BIRTHDAY: 'Birthday',
  ANNIVERSARY: 'Anniversary',
  SYMPATHY: 'Sympathy',
  THANK_YOU: 'Thank You',
  LOVE: 'Love & Romance',
  GET_WELL: 'Get Well',
  CONGRATULATIONS: 'Congratulations',
  OTHER: 'Special Occasion',
};

export const DEFAULT_REMINDER_DAYS = [7, 1];

export function parseReminderDays(input: unknown): number[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? safeJsonParseArray(input)
      : [];

  const parsed = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 365);

  const unique = Array.from(new Set(parsed)).sort((a, b) => b - a);
  return unique.length ? unique : [...DEFAULT_REMINDER_DAYS];
}

function safeJsonParseArray(input: string): unknown[] {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeOccasionLabel(occasion: string): string {
  if (!occasion) return 'Special Occasion';
  const normalized = occasion.trim().toUpperCase();
  return OCCASION_LABELS[normalized] || toTitleCase(occasion);
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export function getMonthDay(date: Date): { month: number; day: number } {
  return {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function getTargetDate(daysBefore: number, now: Date = new Date()): Date {
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + daysBefore);
  return target;
}

// --- Shared helpers (used by both reminders route and cron) ---

export type StoreInfo = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  logoUrl: string | null;
};

export function getWebsiteBaseUrl(): string {
  return (process.env.WWW_URL || process.env.PUBLIC_WWW_URL || 'https://www.hellobloom.ca').replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  return (process.env.API_URL || process.env.PUBLIC_API_URL || 'https://api.hellobloom.ca').replace(/\/$/, '');
}

export async function getStoreInfo(): Promise<StoreInfo> {
  const settings = await prisma.storeSettings.findFirst();

  const storeName = settings?.storeName?.trim() || 'Your Flower Shop';
  const addressParts = [
    settings?.address,
    settings?.city,
    settings?.state,
    settings?.zipCode,
    settings?.country,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return {
    storeName,
    storeEmail: settings?.email?.trim() || '',
    storePhone: settings?.phone?.trim() || '',
    storeAddress: addressParts.join(', '),
    logoUrl: settings?.logoUrl || null,
  };
}

export function buildUnsubscribeUrl(customerId: string, type: ReminderUnsubscribeKind, reminderId?: string): string {
  const token = generateReminderUnsubscribeToken({
    customerId,
    type,
    reminderId,
  });
  return `${getApiBaseUrl()}/api/reminders/unsubscribe?token=${encodeURIComponent(token)}`;
}
