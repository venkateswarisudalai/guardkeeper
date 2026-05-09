import { useMemo, useState } from 'react';
import { Check, X, Minus, Coffee, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { todayISO, fmtDate } from '../lib/format';
import type { AttendanceStatus } from '../types';
import { format, addDays, parseISO } from 'date-fns';
import clsx from 'clsx';

const STATUSES: { key: AttendanceStatus; label: string; cls: string; icon: any; activeCls: string }[] = [
  { key: 'present', label: 'Present', cls: 'text-emerald-700 hover:bg-emerald-50 ring-emerald-200', activeCls: 'bg-emerald-600 text-white ring-emerald-600', icon: Check },
  { key: 'half', label: 'Half', cls: 'text-amber-700 hover:bg-amber-50 ring-amber-200', activeCls: 'bg-amber-500 text-white ring-amber-500', icon: Minus },
  { key: 'leave', label: 'Leave', cls: 'text-sky-700 hover:bg-sky-50 ring-sky-200', activeCls: 'bg-sky-600 text-white ring-sky-600', icon: Coffee },
  { key: 'absent', label: 'Absent', cls: 'text-red-700 hover:bg-red-50 ring-red-200', activeCls: 'bg-red-600 text-white ring-red-600', icon: X },
];

export default function Attendance() {
  const guards = useStore(s => s.guards);
  const areas = useStore(s => s.areas);
  const attendance = useStore(s => s.attendance);
  const setAttendance = useStore(s => s.setAttendance);
  const bulkSetAttendance = useStore(s => s.bulkSetAttendance);

  const [date, setDate] = useState(todayISO());
  const [areaFilter, setAreaFilter] = useState('');

  const activeGuards = useMemo(
    () => guards.filter(g => g.active && (!areaFilter || g.areaId === areaFilter))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [guards, areaFilter],
  );

  const map = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    for (const a of attendance) if (a.date === date) m.set(a.guardId, a.status);
    return m;
  }, [attendance, date]);

  const counts = useMemo(() => {
    const c = { present: 0, half: 0, absent: 0, leave: 0, marked: 0 };
    for (const g of activeGuards) {
      const s = map.get(g.id);
      if (s) {
        c.marked++;
        c[s]++;
      }
    }
    return c;
  }, [activeGuards, map]);

  function toggle(guardId: string, status: AttendanceStatus) {
    if (map.get(guardId) === status) setAttendance(guardId, date, null);
    else setAttendance(guardId, date, status);
  }

  function markAll(status: AttendanceStatus) {
    if (!confirm(`Mark all ${activeGuards.length} guards as ${status} for ${fmtDate(date)}?`)) return;
    bulkSetAttendance(activeGuards.map(g => g.id), date, status);
  }

  if (activeGuards.length === 0 && guards.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink-900">Attendance</h1>
        <EmptyState icon={<Users size={20} />} title="No guards to mark" body="Add guards under the Guards tab first." />
      </div>
    );
  }

  const dateObj = parseISO(date);
  const isToday = date === todayISO();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Attendance</h1>
        <p className="text-ink-500 text-sm mt-1">Tap a status next to a guard. Tap again to clear.</p>
      </div>

      {/* Date navigator */}
      <div className="card p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost p-2" onClick={() => setDate(format(addDays(dateObj, -1), 'yyyy-MM-dd'))} aria-label="Previous day"><ChevronLeft size={16} /></button>
          <input type="date" className="input max-w-[180px]" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} />
          <button className="btn-ghost p-2" onClick={() => setDate(format(addDays(dateObj, 1), 'yyyy-MM-dd'))} aria-label="Next day" disabled={isToday}><ChevronRight size={16} /></button>
          <div className="text-sm font-medium text-ink-700">{fmtDate(date, 'EEEE, d MMM yyyy')} {isToday && <span className="chip bg-accent-50 text-accent-700 ml-1.5">Today</span>}</div>
          <div className="ml-auto flex items-center gap-2">
            <select className="input max-w-[180px]" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
              <option value="">All areas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {!isToday && <button className="btn-ghost text-xs" onClick={() => setDate(todayISO())}>Jump to today</button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <span className="chip bg-emerald-100 text-emerald-700">Present {counts.present}</span>
          <span className="chip bg-amber-100 text-amber-700">Half {counts.half}</span>
          <span className="chip bg-sky-100 text-sky-700">Leave {counts.leave}</span>
          <span className="chip bg-red-100 text-red-700">Absent {counts.absent}</span>
          <span className="chip bg-ink-100 text-ink-600">{counts.marked}/{activeGuards.length} marked</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-ink-400 hidden sm:inline">Mark all:</span>
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => markAll(s.key)} className={`chip ring-1 ring-inset ${s.cls.replace('hover:bg-', 'hover:bg-')}`}>
                <s.icon size={12} /> {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeGuards.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="No guards in this area" body="Try clearing the area filter." />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-ink-100">
            {activeGuards.map(g => {
              const status = map.get(g.id);
              const area = areas.find(a => a.id === g.areaId)?.name ?? '—';
              return (
                <li key={g.id} className="flex items-center gap-3 px-3 sm:px-4 py-3">
                  <Avatar name={g.name} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{g.name}</div>
                    <div className="text-xs text-ink-400 truncate">{area}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {STATUSES.map(s => {
                      const active = status === s.key;
                      return (
                        <button
                          key={s.key}
                          onClick={() => toggle(g.id, s.key)}
                          aria-label={s.label}
                          title={s.label}
                          className={clsx(
                            'rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition active:scale-95',
                            active ? s.activeCls : `bg-white ${s.cls}`,
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <s.icon size={13} />
                            <span className="hidden sm:inline">{s.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
