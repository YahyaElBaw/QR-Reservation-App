/**
 * Format money in TND with 3 decimals as specified in theme.txt and 00_SHARED_CONTEXT.md.
 * Example: 24.5 -> "24.500 TND"
 */
export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.000 TND';
  }
  return `${Number(amount).toFixed(3)} TND`;
}
