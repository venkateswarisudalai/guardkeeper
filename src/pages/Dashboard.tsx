import { Link } from 'react-router-dom';
import { Users, MapPin, CalendarCheck, Wallet, ArrowRight, Sparkles } from 'lucide-react';
import { useStore, snapshot } from '../lib/store';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { money, todayISO, thisMonth, monthLabel } from '../lib/format';
import { computeSalary } from '../lib/salary';
import { Avatar } from '../components/Avatar';
import { seedDemoData } from '../lib/seed';

export default function Dashboard() {
  const guards = useStore(s => s.guards);
  const areas = useStore(s => s.areas);
  const attendance = useStore(s => s.attendance);
  const symbol = useStore(s => s.settings.currencySymbol);
  const today = todayISO();
  const ym = thisMonth();

  const activeGuards = guards.filter(g => g.active);
  const todayMap = new Map(attendance.filter(a => a.date === today).map(a => [a.guardId, a.status]));
  const presentToday = activeGuards.filter(g => todayMap.get(g.id) === 'present').length;
  const halfToday = activeGuards.filter(g => todayMap.get(g.id) === 'half').length;
  const markedToday = activeGuards.filter(g => todayMap.has(g.id)).length;
  const attendanceRate = activeGuards.length ? Math.round(((presentToday + halfToday * 0.5) / activeGuards.length) * 100) : 0;

  const monthData = snapshot();
  const monthTotals = activeGuards.reduce((acc, g) => {
    const c = computeSalary(g, ym, monthData);
    acc.gross += c.gross;
    acc.net += c.net;
    acc.balance += c.balance;
    return acc;
  }, { gross: 0, net: 0, balance: 0 });

  if (guards.length === 0 && areas.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Welcome to GuardKeeper</h1>
          <p className="text-ink-500 mt-1">Track attendance, manage uniforms, and pay your security guards — all in one quiet place.</p>
        </div>
        <EmptyState
          icon={<Sparkles size={20} />}
          title="Let's get you set up"
          body="Start by adding your areas (sites you manage), then add the guards working there. You can also load a sample workspace to see how everything fits together."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/areas" className="btn-primary">Add your first area <ArrowRight size={16} /></Link>
              <button className="btn-secondary" onClick={() => seedDemoData()}>Load sample data</button>
            </div>
          }
        />
      </div>
    );
  }

  const recentGuards = [...activeGuards]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Today at a glance</h1>
          <p className="text-ink-500 text-sm mt-1">{monthLabel(ym)} • {activeGuards.length} active guard{activeGuards.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/attendance" className="btn-primary">Take attendance <ArrowRight size={16} /></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Active guards" value={activeGuards.length} hint={`${guards.length - activeGuards.length} inactive`} icon={<Users size={16} />} accent="blue" />
        <StatCard label="Areas" value={areas.length} hint={areas.length ? `Across ${areas.length} sites` : 'No areas yet'} icon={<MapPin size={16} />} accent="plain" />
        <StatCard label="Today's attendance" value={`${attendanceRate}%`} hint={`${markedToday} of ${activeGuards.length} marked`} icon={<CalendarCheck size={16} />} accent="green" />
        <StatCard label={`${monthLabel(ym)} payable`} value={money(monthTotals.net, symbol)} hint={`Balance ${money(monthTotals.balance, symbol)}`} icon={<Wallet size={16} />} accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink-900">Today — {presentToday + halfToday}/{activeGuards.length} marked present</h2>
            <Link to="/attendance" className="text-xs font-medium text-ink-600 hover:text-ink-900">Go to attendance →</Link>
          </div>
          {activeGuards.length === 0 ? (
            <p className="text-sm text-ink-500">Add guards to start tracking attendance.</p>
          ) : (
            <ul className="divide-y divide-ink-100 -mx-2">
              {activeGuards.slice(0, 6).map(g => {
                const status = todayMap.get(g.id);
                const area = areas.find(a => a.id === g.areaId)?.name ?? '—';
                const chipCls = status === 'present' ? 'bg-emerald-100 text-emerald-700'
                  : status === 'half' ? 'bg-amber-100 text-amber-700'
                  : status === 'absent' ? 'bg-red-100 text-red-700'
                  : status === 'leave' ? 'bg-sky-100 text-sky-700'
                  : 'bg-ink-100 text-ink-500';
                const label = status ? status[0].toUpperCase() + status.slice(1) : 'Not marked';
                return (
                  <li key={g.id} className="flex items-center gap-3 px-2 py-2.5">
                    <Avatar name={g.name} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{g.name}</div>
                      <div className="text-xs text-ink-400 truncate">{area}</div>
                    </div>
                    <span className={`chip ${chipCls}`}>{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Recently added</h2>
          {recentGuards.length === 0 ? (
            <p className="text-sm text-ink-500">No guards yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentGuards.map(g => (
                <li key={g.id} className="flex items-center gap-3">
                  <Avatar name={g.name} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{g.name}</div>
                    <div className="text-xs text-ink-400 truncate">{areas.find(a => a.id === g.areaId)?.name ?? '—'}</div>
                  </div>
                  <span className="text-xs text-ink-500 tabular-nums">{money(g.dailyRate, symbol)}/d</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
