import { eachDayOfInterval, format, getDay, isSameMonth, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import clsx from 'clsx';
import type { AttendanceRecord, AttendanceStatus, Holiday } from '../types';

interface Props {
  ym: string; // YYYY-MM
  records: AttendanceRecord[];
  holidays?: Holiday[];
  weeklyOff?: number[];
}

const colors: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500 text-white',
  half: 'bg-amber-400 text-white',
  leave: 'bg-sky-500 text-white',
  absent: 'bg-red-500 text-white',
};

export function CalendarGrid({ ym, records, holidays = [], weeklyOff = [] }: Props) {
  const monthDate = parseISO(`${ym}-01`);
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start, end });

  // pad before
  const padStart = getDay(start);
  const cells: (Date | null)[] = [...Array(padStart).fill(null), ...days];
  const recMap = new Map(records.map(r => [r.date, r.status]));
  const holMap = new Map(holidays.map(h => [h.date, h]));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-ink-400 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = format(d, 'yyyy-MM-dd');
          const status = recMap.get(iso);
          const holiday = holMap.get(iso);
          const wOff = weeklyOff.includes(getDay(d));
          const dim = !isSameMonth(d, monthDate);
          return (
            <div
              key={i}
              title={`${iso}${status ? ' • ' + status : holiday ? ' • ' + holiday.name : wOff ? ' • Weekly off' : ''}`}
              className={clsx(
                'aspect-square rounded-md text-xs flex items-center justify-center font-medium select-none',
                status ? colors[status] : holiday ? 'bg-violet-200 text-violet-800' : wOff ? 'bg-ink-100 text-ink-400' : 'bg-ink-50 text-ink-500',
                dim && 'opacity-40',
              )}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-ink-500">
        <Legend cls="bg-emerald-500" label="Present" />
        <Legend cls="bg-amber-400" label="Half" />
        <Legend cls="bg-sky-500" label="Leave" />
        <Legend cls="bg-red-500" label="Absent" />
        <Legend cls="bg-violet-200" label="Holiday" />
        <Legend cls="bg-ink-100 ring-1 ring-inset ring-ink-200" label="Weekly off" />
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${cls}`} /> {label}
    </span>
  );
}
