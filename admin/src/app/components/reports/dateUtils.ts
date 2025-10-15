export interface DateRange {
  start: string;
  end: string;
}

export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayRange = (): DateRange => {
  const today = new Date();
  const normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const iso = toISODate(normalized);
  return { start: iso, end: iso };
};

export const getWeekRange = (): DateRange => {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start: toISODate(start), end: toISODate(end) };
};

export const getMonthRange = (): DateRange => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return { start: toISODate(start), end: toISODate(end) };
};
