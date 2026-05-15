export const formatNaira = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(num);
};

export const formatCompact = (amount: number): string => {
  if (amount < 1_000_000) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  return formatNaira(amount);
};

/**
 * Safely parse a date string into a Date.
 *
 * The JS spec treats "YYYY-MM-DD" as UTC midnight, which shifts the displayed
 * date by one day for users in UTC+ timezones (e.g. Nigeria WAT = UTC+1).
 * Appending T00:00:00 (no Z) forces the engine to use local time instead.
 *
 * Full ISO-8601 datetime strings (with T) are left unchanged — they already
 * carry enough information for the engine to interpret correctly.
 */
function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(date + 'T00:00:00')   // local midnight, not UTC midnight
    : new Date(date);
}

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(parseDate(date));

export const formatDateTime = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(parseDate(date));

export const formatProfit = (profit: number) => ({
  formatted: formatNaira(Math.abs(profit)),
  isPositive: profit >= 0,
  sign: profit >= 0 ? '+' : '-',
  label: profit >= 0 ? 'Profit' : 'Loss',
  color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
  bgColor: profit >= 0 ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
});

export const calcProfit = (revenue: number, expenses: number) => revenue - expenses;
export const calcTithe = (profit: number) => profit > 0 ? profit * 0.10 : 0;

export const formatNumberInput = (value: string): string => {
  const raw = value.replace(/[^0-9.]/g, '');
  const parts = raw.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.slice(0, 2).join('.');
};
