/**
 * Formats integer/float numbers into Uzbek Som (soʻm) currency representation
 * Example: 189000 -> "189 000 soʻm"
 */
export function formatUZS(amount: number): string {
  const rounded = Math.round(amount);
  const formattedNumber = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedNumber} soʻm`;
}

/**
 * Formats compact numbers for charts/stats
 */
export function formatCompactUZS(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} mln soʻm`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)} ming soʻm`;
  }
  return `${amount} soʻm`;
}

/**
 * Formats an ISO date string into readable Uzbek date format
 */
export function formatDateUz(isoDate: string, includeTime = false): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;

    const day = String(date.getDate()).padStart(2, '0');
    const months = [
      'Yanvar',
      'Fevral',
      'Mart',
      'Aprel',
      'May',
      'Iyun',
      'Iyul',
      'Avgust',
      'Sentabr',
      'Oktabr',
      'Noyabr',
      'Dekabr',
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    if (!includeTime) {
      return `${day}-${month}, ${year}`;
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
}

/**
 * Formats Uzbekistan phone input progressively: +998 90 123-45-67
 */
export function formatUzbekPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let localDigits = digits;
  if (localDigits.startsWith('998')) {
    localDigits = localDigits.slice(3);
  }
  localDigits = localDigits.slice(0, 9);

  if (localDigits.length === 0) return '+998 ';
  if (localDigits.length <= 2) return `+998 ${localDigits}`;
  if (localDigits.length <= 5) {
    return `+998 ${localDigits.slice(0, 2)} ${localDigits.slice(2)}`;
  }
  if (localDigits.length <= 7) {
    return `+998 ${localDigits.slice(0, 2)} ${localDigits.slice(2, 5)}-${localDigits.slice(5)}`;
  }
  return `+998 ${localDigits.slice(0, 2)} ${localDigits.slice(2, 5)}-${localDigits.slice(5, 7)}-${localDigits.slice(7, 9)}`;
}

/**
 * Validates that a phone string has 9 local digits (12 total with 998)
 */
export function isValidUzbekPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return (
    (digits.length === 12 && digits.startsWith('998')) || digits.length === 9
  );
}

/**
 * Normalizes an optional Telegram username (with or without leading '@' or t.me/ prefix)
 * into '@username'. Returns undefined if blank.
 */
export function normalizeTelegramUsername(
  raw: string | undefined | null
): string | undefined {
  if (!raw) return undefined;
  let cleaned = raw.trim();
  if (!cleaned) return undefined;

  cleaned = cleaned
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
    .replace(/^@+/, '')
    .trim();

  if (!cleaned) return undefined;
  return `@${cleaned}`;
}

/**
 * Gently validates an optional Telegram username:
 * Empty string is always valid (field is optional).
 * When provided, accepts 5-32 alphanumeric/underscore characters (with or without leading '@').
 */
export function isValidTelegramUsername(
  raw: string | undefined | null
): boolean {
  if (!raw || !raw.trim()) return true;
  const normalized = normalizeTelegramUsername(raw);
  if (!normalized) return true;
  return /^@[A-Za-z0-9_]{5,32}$/.test(normalized);
}

/**
 * Generates URL-friendly slug from product/category title
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
 * Calculates discount percentage if salePrice is active
 */
export function calculateDiscountPercent(
  price: number,
  salePrice?: number | null
): number {
  if (!salePrice || salePrice >= price || price <= 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
