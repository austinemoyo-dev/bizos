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
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return formatNaira(amount);
};

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));

export const formatDateTime = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));

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
