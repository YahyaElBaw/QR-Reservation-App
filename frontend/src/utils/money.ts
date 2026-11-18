export function money(value: number, locale = 'fr') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}
export const subtotal = (price: number, quantity: number) =>
  (Math.round(price * 1000) * quantity) / 1000
export const total = (items: { subtotal: number }[]) =>
  items.reduce((sum, item) => sum + Math.round(item.subtotal * 1000), 0) / 1000
export const tunisDay = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
