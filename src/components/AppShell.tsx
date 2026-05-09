import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPin, Users, CalendarCheck, Wallet, Settings as SettingsIcon, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../lib/store';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/guards', label: 'Guards', icon: Users },
  { to: '/areas', label: 'Areas', icon: MapPin },
  { to: '/salary', label: 'Salary', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell() {
  const location = useLocation();
  const businessName = useStore(s => s.settings.businessName);
  const ownerName = useStore(s => s.settings.ownerName);

  const currentTitle = nav.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label ?? '';

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-ink-100 bg-white">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ink-900 text-white grid place-items-center">
              <Shield size={18} strokeWidth={2.4} />
            </div>
            <div>
              <div className="font-semibold text-ink-900 leading-none">GuardKeeper</div>
              <div className="text-[11px] text-ink-400 mt-1">{businessName || 'Owner workspace'}</div>
            </div>
          </div>
        </div>
        <nav className="px-3 mt-2 flex flex-col gap-0.5">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
                isActive ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100',
              )}
            >
              <item.icon size={17} strokeWidth={2.1} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4 text-[11px] text-ink-400">
          {ownerName ? <>Logged in as <span className="text-ink-700 font-medium">{ownerName}</span></> : 'Local-only • Your data never leaves this device'}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-ink-900 text-white grid place-items-center">
          <Shield size={16} strokeWidth={2.4} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-ink-900 text-sm leading-none">GuardKeeper</div>
          <div className="text-[11px] text-ink-400 mt-1">{currentTitle}</div>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-ink-100 px-2 py-1.5 flex">
        {nav.slice(0, 5).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md text-[10px] font-medium',
              isActive ? 'text-ink-900' : 'text-ink-400',
            )}
          >
            <item.icon size={20} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
