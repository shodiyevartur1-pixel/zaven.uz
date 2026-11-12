/**
 * Formats an integer amount in Uzbekistani so'm (UZS)
 * Example: 125000 -> "125 000 soʻm"
 */
export function formatUZS(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '0 soʻm';
  }
  const rounded = Math.round(amount);
  const formattedNumber = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedNumber} soʻm`;
}

/**
 * Formats raw digits or phone input into Uzbek standard +998 XX XXX-XX-XX
 */
export function formatUzbekPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  let local = digits;

  if (local.startsWith('998')) {
    local = local.slice(3);
  }
  local = local.slice(0, 9);

  if (local.length === 0) return '+998 ';
  if (local.length <= 2) return `+998 ${local}`;
  if (local.length <= 5) return `+998 ${local.slice(0, 2)} ${local.slice(2)}`;
  if (local.length <= 7) {
    return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)}-${local.slice(5)}`;
  }
  return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7, 9)}`;
}

/**
 * Validates whether a phone string has 9 valid local digits after +998
 */
export function isValidUzbekPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('998')) {
    return digits.length === 12;
  }
  return digits.length === 9;
}

/**
 * Formats ISO dates into readable Uzbek Latin date format
 * Example: "2025-02-18T10:30:00Z" -> "18.02.2025, 15:30"
 */
export function formatDateUz(isoDate: string, includeTime = false): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    if (!includeTime) {
      return `${day}.${month}.${year}`;
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
}

/**
 * Generates URL-friendly slugs from Uzbek Latin product/category names
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/oʻ|o'|o`/g, 'o')
    .replace(/gʻ|g'|g`/g, 'g')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Calculates discount percentage between regular price and sale price
 */
export function calculateDiscountPercent(price: number, salePrice?: number | null): number {
  if (!salePrice || salePrice >= price || price <= 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
