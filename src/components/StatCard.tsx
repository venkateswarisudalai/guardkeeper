import type { ReactNode } from 'react';

export function StatCard({ label, value, hint, icon, accent }: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'plain';
}) {
  const accentBg = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-accent-50 text-accent-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    plain: 'bg-ink-100 text-ink-600',
  }[accent ?? 'plain'];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</div>
        {icon && <div className={`w-8 h-8 rounded-lg grid place-items-center ${accentBg}`}>{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink-900 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}
