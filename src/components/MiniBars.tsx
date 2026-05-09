import clsx from 'clsx';

interface Props {
  data: Array<{ label: string; value: number; sub?: string }>;
  formatValue: (n: number) => string;
}

export function MiniBars({ data, formatValue }: Props) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="text-[10px] text-ink-400 tabular-nums truncate w-full text-center">{formatValue(d.value)}</div>
            <div className={clsx('w-full rounded-t-md transition', d.value === 0 ? 'bg-ink-100' : 'bg-ink-900')} style={{ height: `${Math.max(2, h)}%` }} />
            <div className="text-[10px] text-ink-500 truncate w-full text-center">{d.label}</div>
            {d.sub && <div className="text-[9px] text-ink-300 truncate w-full text-center">{d.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}
