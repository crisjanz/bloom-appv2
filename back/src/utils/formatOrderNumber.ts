export function formatOrderNumber(
  orderNumber: number | string | null | undefined,
  prefix?: string
): string {
  if (orderNumber == null || orderNumber === '') {
    return 'N/A';
  }

  return prefix ? `${prefix}${orderNumber}` : `${orderNumber}`;
}
