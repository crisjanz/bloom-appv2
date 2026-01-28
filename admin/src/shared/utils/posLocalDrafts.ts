export type LocalDraft = {
  id: string;
  items: any[];
  customer: any | null;
  discounts: any[];
  giftCardDiscount: number;
  couponDiscount: { amount: number; name?: string };
  savedAt: string;
  itemCount: number;
  totalCents: number;
};

const STORAGE_KEY = 'pos_local_drafts';
const MAX_DRAFT_AGE_MS = 10 * 24 * 60 * 60 * 1000;

const isBrowser = typeof window !== 'undefined';

const parseDrafts = (): LocalDraft[] => {
  if (!isBrowser) return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse local POS drafts:', error);
    return [];
  }
};

const writeDrafts = (drafts: LocalDraft[]) => {
  if (!isBrowser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save local POS drafts:', error);
  }
};

const purgeOldDrafts = (drafts: LocalDraft[]) => {
  const now = Date.now();
  return drafts.filter((draft) => {
    if (!draft.savedAt) return false;
    const savedAt = new Date(draft.savedAt).getTime();
    return Number.isFinite(savedAt) && now - savedAt <= MAX_DRAFT_AGE_MS;
  });
};

export const getLocalDrafts = (): LocalDraft[] => {
  const drafts = parseDrafts();
  const freshDrafts = purgeOldDrafts(drafts);

  if (freshDrafts.length !== drafts.length) {
    writeDrafts(freshDrafts);
  }

  return freshDrafts;
};

export const saveLocalDraft = (draft: LocalDraft): void => {
  if (!isBrowser) return;

  const drafts = getLocalDrafts();
  const savedAt = new Date().toISOString();
  const nextDraft: LocalDraft = {
    ...draft,
    savedAt,
    itemCount: draft.itemCount ?? draft.items?.length ?? 0,
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

export const deleteLocalDraft = (id: string): void => {
  if (!isBrowser) return;

  const drafts = getLocalDrafts().filter((draft) => draft.id !== id);
  writeDrafts(drafts);
};

export const clearAllLocalDrafts = (): void => {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear local POS drafts:', error);
  }
};
