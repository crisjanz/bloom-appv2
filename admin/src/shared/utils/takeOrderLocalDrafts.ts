export type TakeOrderLocalDraft = {
  id: string;
  orders: any[];
  customer: any | null;
  employee: string;
  orderSource: string;
  couponDiscount: number;
  manualDiscount: number;
  manualDiscountType: '$' | '%';
  giftCardDiscount: number;
  automaticDiscount: number;
  appliedAutomaticDiscounts: any[];
  activeTab: number;
  savedAt: string;
  itemCount: number;
  totalCents: number;
};

const STORAGE_KEY = 'takeorder_local_drafts';
const MAX_DRAFT_AGE_MS = 10 * 24 * 60 * 60 * 1000;

const isBrowser = typeof window !== 'undefined';

const parseDrafts = (): TakeOrderLocalDraft[] => {
  if (!isBrowser) return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse TakeOrder drafts:', error);
    return [];
  }
};

const writeDrafts = (drafts: TakeOrderLocalDraft[]) => {
  if (!isBrowser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save TakeOrder drafts:', error);
  }
};

const purgeOldDrafts = (drafts: TakeOrderLocalDraft[]) => {
  const now = Date.now();
  return drafts.filter((draft) => {
    if (!draft.savedAt) return false;
    const savedAt = new Date(draft.savedAt).getTime();
    return Number.isFinite(savedAt) && now - savedAt <= MAX_DRAFT_AGE_MS;
  });
};

export const getTakeOrderLocalDrafts = (): TakeOrderLocalDraft[] => {
  const drafts = parseDrafts();
  const freshDrafts = purgeOldDrafts(drafts);

  if (freshDrafts.length !== drafts.length) {
    writeDrafts(freshDrafts);
  }

  return freshDrafts;
};

export const saveTakeOrderLocalDraft = (draft: TakeOrderLocalDraft): void => {
  if (!isBrowser) return;

  const drafts = getTakeOrderLocalDrafts();
  const savedAt = new Date().toISOString();
  const nextDraft: TakeOrderLocalDraft = {
    ...draft,
    savedAt,
    itemCount: Number.isFinite(draft.itemCount) ? draft.itemCount : 0,
    totalCents: Number.isFinite(draft.totalCents) ? draft.totalCents : 0,
  };

  const existingIndex = drafts.findIndex((existing) => existing.id === draft.id);
  if (existingIndex >= 0) {
    drafts[existingIndex] = nextDraft;
  } else {
    drafts.push(nextDraft);
  }

  writeDrafts(drafts);
};

export const deleteTakeOrderLocalDraft = (id: string): void => {
  if (!isBrowser) return;

  const drafts = getTakeOrderLocalDrafts().filter((draft) => draft.id !== id);
  writeDrafts(drafts);
};

export const clearTakeOrderLocalDrafts = (): void => {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear TakeOrder drafts:', error);
  }
};
