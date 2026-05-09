import { format, parseISO } from 'date-fns';

export function money(n: number, symbol = '₹'): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString('en-IN');
  return `${sign}${symbol}${s}`;
}

export function fmtDate(iso: string, pattern = 'd MMM yyyy'): string {
  try { return format(parseISO(iso), pattern); }
  catch { return iso; }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function thisMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function monthLabel(ym: string): string {
  try { return format(parseISO(`${ym}-01`), 'MMMM yyyy'); }
  catch { return ym; }
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}
