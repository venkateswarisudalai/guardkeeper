import { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { Phone, MapPin, Calendar, Wallet, Shirt, ArrowDownToLine } from 'lucide-react';
import type { Guard } from '../types';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { CalendarGrid } from './CalendarGrid';
import { MiniBars } from './MiniBars';
import { useStore, snapshot } from '../lib/store';
import { computeSalary } from '../lib/salary';
import { money, fmtDate, monthLabel } from '../lib/format';
import { downloadSlipPDF, whatsappUrl, buildSalaryShareText } from '../lib/io';

interface Props {
  guard: Guard | null;
  onClose: () => void;
  onEdit?: (g: Guard) => void;
}

export function GuardProfile({ guard, onClose, onEdit }: Props) {
  const areas = useStore(s => s.areas);
  const attendance = useStore(s => s.attendance);
  const uniforms = useStore(s => s.uniforms);
  const adjustments = useStore(s => s.adjustments);
  const payments = useStore(s => s.payments);
  const holidays = useStore(s => s.holidays);
  const settings = useStore(s => s.settings);
  const symbol = settings.currencySymbol;

  const data = useMemo(() => snapshot(), [attendance, uniforms, adjustments, payments, holidays]);

  if (!guard) return null;

  const area = areas.find(a => a.id === guard.areaId);
  const today = new Date();
  const ym = format(today, 'yyyy-MM');
  const lastSixMonths = Array.from({ length: 6 }, (_, i) => format(subMonths(today, 5 - i), 'yyyy-MM'));

  const recsForGuard = attendance.filter(a => a.guardId === guard.id);
  const monthRecs = recsForGuard.filter(a => a.date.startsWith(ym));
  const monthHolidays = holidays.filter(h => h.date.startsWith(ym));
  const calc = computeSalary(guard, ym, data);

  const trend = lastSixMonths.map(m => {
    const c = computeSalary(guard, m, data);
    return { label: format(new Date(m + '-01'), 'MMM'), value: c.net, sub: `${c.workedUnits}d` };
  });

  const lifetimePresent = recsForGuard.filter(r => r.status === 'present').length;
  const lifetimeHalf = recsForGuard.filter(r => r.status === 'half').length;
  const totalPaid = payments.filter(p => p.guardId === guard.id).reduce((s, p) => s + p.amount, 0);

  const guardUniforms = uniforms.filter(u => u.guardId === guard.id).sort((a, b) => b.date.localeCompare(a.date));
  const guardPayments = payments.filter(p => p.guardId === guard.id).sort((a, b) => b.paidOn.localeCompare(a.paidOn));

  function shareWA() {
    if (!guard?.phone) {
      alert('Add a phone number for this guard to share via WhatsApp.');
      return;
    }
    const text = buildSalaryShareText(guard, area?.name ?? '—', ym, calc, settings.businessName, symbol);
    window.open(whatsappUrl(guard.phone, text), '_blank');
  }

  function downloadSlip() {
    downloadSlipPDF(guard!, area?.name ?? '—', ym, calc, symbol, settings.businessName, settings.ownerName);
  }

  return (
    <Modal
      open={!!guard}
      onClose={onClose}
      size="lg"
      title={guard.name}
      description={`${area?.name ?? '—'} • Joined ${fmtDate(guard.joinDate)}`}
      footer={
        <>
          {onEdit && <button className="btn-secondary" onClick={() => onEdit(guard)}>Edit profile</button>}
          <button className="btn-secondary" onClick={downloadSlip}><ArrowDownToLine size={16} /> Slip</button>
          <button className="btn-primary" onClick={shareWA}>Share on WhatsApp</button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={guard.name} size={56} />
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat icon={<Calendar size={13} />} label="This month" value={`${calc.workedUnits}d`} sub={`P${calc.presentDays} H${calc.halfDays}`} />
            <Stat icon={<Wallet size={13} />} label="Net (this mo)" value={money(calc.net, symbol)} sub={`Bal ${money(calc.balance, symbol)}`} />
            <Stat icon={<Wallet size={13} />} label="Outstanding" value={money(calc.outstandingAdvance, symbol)} sub="From past months" />
            <Stat icon={<Wallet size={13} />} label="Lifetime paid" value={money(totalPaid, symbol)} sub={`${lifetimePresent + lifetimeHalf * 0.5} units worked`} />
          </div>
        </div>
        {(guard.phone || guard.notes) && (
          <div className="flex items-center flex-wrap gap-3 text-xs text-ink-500">
            {guard.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {guard.phone}</span>}
            {area?.address && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {area.address}</span>}
            {guard.notes && <span className="text-ink-400">{guard.notes}</span>}
          </div>
        )}

        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink-900">{monthLabel(ym)} attendance</h3>
            <span className="text-xs text-ink-400">Tap a date in the Attendance tab to edit</span>
          </div>
          <CalendarGrid ym={ym} records={monthRecs} holidays={monthHolidays} weeklyOff={guard.weeklyOff || []} />
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-semibold text-ink-900 mb-3">Net salary — last 6 months</h3>
          <MiniBars data={trend} formatValue={(n) => money(n, symbol)} />
        </section>

        {guardUniforms.length > 0 && (
          <section className="card p-4">
            <h3 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-1.5"><Shirt size={14} /> Uniforms issued</h3>
            <ul className="divide-y divide-ink-100">
              {guardUniforms.slice(0, 8).map(u => (
                <li key={u.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="text-ink-700 flex-1 truncate">{u.item}</span>
                  <span className="text-xs text-ink-400">{fmtDate(u.date)}</span>
                  <span className="font-semibold tabular-nums">{money(u.cost, symbol)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {guardPayments.length > 0 && (
          <section className="card p-4">
            <h3 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-1.5"><Wallet size={14} /> Payments</h3>
            <ul className="divide-y divide-ink-100">
              {guardPayments.slice(0, 8).map(p => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="chip bg-emerald-100 text-emerald-700">{monthLabel(p.month)}</span>
                  <span className="text-ink-500 flex-1 truncate">{p.note || '—'}</span>
                  <span className="text-xs text-ink-400">{fmtDate(p.paidOn)}</span>
                  <span className="font-semibold tabular-nums">{money(p.amount, symbol)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}

function Stat({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-500 flex items-center gap-1">{icon} {label}</div>
      <div className="text-sm font-semibold text-ink-900 tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}
