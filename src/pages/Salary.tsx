import { useMemo, useState } from 'react';
import { Wallet, Download, FileText, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useStore, snapshot } from '../lib/store';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { money, monthLabel, thisMonth, todayISO, fmtDate } from '../lib/format';
import { computeSalary } from '../lib/salary';
import { exportMonthSalaryXLSX, exportMonthSalaryPDF, downloadSlipPDF } from '../lib/io';
import type { Guard, SalaryComputation } from '../types';
import { format, addMonths, parseISO } from 'date-fns';
import clsx from 'clsx';

export default function Salary() {
  const guards = useStore(s => s.guards);
  const areas = useStore(s => s.areas);
  const adjustments = useStore(s => s.adjustments);
  const payments = useStore(s => s.payments);
  const addAdjustment = useStore(s => s.addAdjustment);
  const removeAdjustment = useStore(s => s.removeAdjustment);
  const addPayment = useStore(s => s.addPayment);
  const removePayment = useStore(s => s.removePayment);
  const settings = useStore(s => s.settings);
  const symbol = settings.currencySymbol;

  const [ym, setYm] = useState(thisMonth());
  const [openGuard, setOpenGuard] = useState<Guard | null>(null);
  const [adjDraft, setAdjDraft] = useState({ type: 'advance' as 'advance' | 'bonus' | 'deduction', amount: '', note: '' });
  const [payDraft, setPayDraft] = useState({ amount: '', note: '', paidOn: todayISO() });

  const data = snapshot();
  const activeGuards = useMemo(() => guards.filter(g => g.active).sort((a, b) => a.name.localeCompare(b.name)), [guards]);

  const rows = useMemo(() => activeGuards.map(g => ({
    guard: g,
    areaName: areas.find(a => a.id === g.areaId)?.name ?? '—',
    calc: computeSalary(g, ym, data),
  })), [activeGuards, areas, ym, data]);

  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + r.calc.gross,
    net: acc.net + r.calc.net,
    paid: acc.paid + r.calc.paid,
    balance: acc.balance + r.calc.balance,
  }), { gross: 0, net: 0, paid: 0, balance: 0 });

  const monthDate = parseISO(`${ym}-01`);
  const isCurrentMonth = ym >= thisMonth();

  const guardCalc: SalaryComputation | null = openGuard ? computeSalary(openGuard, ym, data) : null;
  const guardAdjustments = openGuard ? adjustments.filter(a => a.guardId === openGuard.id && a.month === ym) : [];
  const guardPayments = openGuard ? payments.filter(p => p.guardId === openGuard.id && p.month === ym) : [];

  function downloadXLSX() {
    exportMonthSalaryXLSX(rows, ym, `Salary_${ym}.xlsx`, symbol);
  }
  function downloadPDF() {
    exportMonthSalaryPDF(rows, ym, `Salary_${ym}.pdf`, symbol, settings.businessName, settings.ownerName);
  }
  function addAdj() {
    if (!openGuard || !adjDraft.amount) return;
    addAdjustment({ guardId: openGuard.id, month: ym, type: adjDraft.type, amount: Number(adjDraft.amount) || 0, note: adjDraft.note });
    setAdjDraft({ type: adjDraft.type, amount: '', note: '' });
  }
  function addPay() {
    if (!openGuard || !payDraft.amount) return;
    addPayment({ guardId: openGuard.id, month: ym, amount: Number(payDraft.amount) || 0, paidOn: payDraft.paidOn, note: payDraft.note });
    setPayDraft({ amount: '', note: '', paidOn: todayISO() });
  }
  function quickPaySettle() {
    if (!openGuard || !guardCalc || guardCalc.balance <= 0) return;
    addPayment({ guardId: openGuard.id, month: ym, amount: guardCalc.balance, paidOn: todayISO(), note: 'Settled' });
  }

  if (activeGuards.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink-900">Salary</h1>
        <EmptyState icon={<Wallet size={20} />} title="No active guards" body="Add a guard under the Guards tab to compute salary." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Salary</h1>
          <p className="text-ink-500 text-sm mt-1">Auto-calculated from attendance, with uniform deductions and adjustments.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={downloadXLSX}><Download size={16} /> Excel</button>
          <button className="btn-primary" onClick={downloadPDF}><FileText size={16} /> PDF</button>
        </div>
      </div>

      <div className="card p-3 md:p-4 flex flex-wrap items-center gap-3">
        <button className="btn-ghost p-2" onClick={() => setYm(format(addMonths(monthDate, -1), 'yyyy-MM'))} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <input type="month" className="input max-w-[180px]" value={ym} onChange={e => setYm(e.target.value)} />
        <button className="btn-ghost p-2" onClick={() => setYm(format(addMonths(monthDate, 1), 'yyyy-MM'))} aria-label="Next month"><ChevronRight size={16} /></button>
        <div className="text-sm font-medium text-ink-700">{monthLabel(ym)} {isCurrentMonth && <span className="chip bg-accent-50 text-accent-700 ml-1.5">Current</span>}</div>
        <div className="ml-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><div className="text-ink-400">Gross</div><div className="font-semibold tabular-nums">{money(totals.gross, symbol)}</div></div>
          <div><div className="text-ink-400">Net</div><div className="font-semibold tabular-nums">{money(totals.net, symbol)}</div></div>
          <div><div className="text-ink-400">Paid</div><div className="font-semibold tabular-nums text-emerald-700">{money(totals.paid, symbol)}</div></div>
          <div><div className="text-ink-400">Balance</div><div className="font-semibold tabular-nums text-amber-700">{money(totals.balance, symbol)}</div></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Desktop table */}
        <table className="hidden md:table w-full text-sm">
          <thead className="bg-ink-50/60 text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-3">Guard</th>
              <th className="text-left font-medium px-2 py-3">Area</th>
              <th className="text-right font-medium px-2 py-3">P / H / A / L</th>
              <th className="text-right font-medium px-2 py-3">Gross</th>
              <th className="text-right font-medium px-2 py-3">Uniform</th>
              <th className="text-right font-medium px-2 py-3">Adj</th>
              <th className="text-right font-medium px-2 py-3">Net</th>
              <th className="text-right font-medium px-2 py-3">Paid</th>
              <th className="text-right font-medium px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map(({ guard, areaName, calc }) => {
              const adj = calc.bonuses - calc.advances - calc.otherDeductions;
              return (
                <tr key={guard.id} className="hover:bg-ink-50/40 cursor-pointer" onClick={() => setOpenGuard(guard)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={guard.name} size={32} />
                      <div className="font-medium text-ink-900">{guard.name}</div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-ink-600">{areaName}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-ink-700">
                    <span className="text-emerald-700">{calc.presentDays}</span>
                    <span className="text-ink-300"> / </span>
                    <span className="text-amber-700">{calc.halfDays}</span>
                    <span className="text-ink-300"> / </span>
                    <span className="text-red-700">{calc.absentDays}</span>
                    <span className="text-ink-300"> / </span>
                    <span className="text-sky-700">{calc.leaveDays}</span>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">{money(calc.gross, symbol)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-red-700">{calc.uniformDeduction ? `−${money(calc.uniformDeduction, symbol)}` : '—'}</td>
                  <td className={clsx('px-2 py-3 text-right tabular-nums', adj > 0 && 'text-emerald-700', adj < 0 && 'text-red-700')}>
                    {adj === 0 ? '—' : `${adj > 0 ? '+' : ''}${money(adj, symbol)}`}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums font-semibold">{money(calc.net, symbol)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-emerald-700">{calc.paid ? money(calc.paid, symbol) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {calc.balance <= 0 && calc.net > 0 ? (
                      <span className="chip bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Settled</span>
                    ) : (
                      <span className="font-semibold text-amber-700">{money(calc.balance, symbol)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile cards */}
        <ul className="md:hidden divide-y divide-ink-100">
          {rows.map(({ guard, areaName, calc }) => (
            <li key={guard.id} className="px-4 py-3" onClick={() => setOpenGuard(guard)}>
              <div className="flex items-center gap-3">
                <Avatar name={guard.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-900 truncate">{guard.name}</div>
                  <div className="text-xs text-ink-400 truncate">{areaName} • {calc.workedUnits} units</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{money(calc.net, symbol)}</div>
                  <div className="text-xs text-amber-700 tabular-nums">Bal {money(calc.balance, symbol)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={!!openGuard}
        onClose={() => setOpenGuard(null)}
        title={openGuard ? `${openGuard.name} — ${monthLabel(ym)}` : ''}
        size="lg"
        footer={
          openGuard && guardCalc && (
            <>
              <button className="btn-secondary" onClick={() => downloadSlipPDF(openGuard, areas.find(a => a.id === openGuard.areaId)?.name ?? '—', ym, guardCalc, symbol, settings.businessName, settings.ownerName)}>
                <FileText size={16} /> Download slip
              </button>
              {guardCalc.balance > 0 && (
                <button className="btn-primary" onClick={quickPaySettle}><CheckCircle2 size={16} /> Settle {money(guardCalc.balance, symbol)}</button>
              )}
            </>
          )
        }
      >
        {openGuard && guardCalc && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Worked" value={`${guardCalc.workedUnits}`} hint={`P${guardCalc.presentDays} H${guardCalc.halfDays}`} />
              <Stat label="Gross" value={money(guardCalc.gross, symbol)} hint={`@ ${money(guardCalc.dailyRate, symbol)}/d`} />
              <Stat label="Net" value={money(guardCalc.net, symbol)} hint={`After ${money(guardCalc.uniformDeduction + guardCalc.advances + guardCalc.otherDeductions - guardCalc.bonuses, symbol)} adj`} />
              <Stat label="Balance" value={money(guardCalc.balance, symbol)} hint={`Paid ${money(guardCalc.paid, symbol)}`} />
            </div>

            <section>
              <SectionHeader title="Adjustments" hint="Advances, bonuses, or other deductions for this month." />
              <div className="grid grid-cols-12 gap-2 mb-3">
                <select className="input col-span-4" value={adjDraft.type} onChange={e => setAdjDraft(s => ({ ...s, type: e.target.value as any }))}>
                  <option value="advance">Advance</option>
                  <option value="bonus">Bonus</option>
                  <option value="deduction">Deduction</option>
                </select>
                <input type="number" min="0" className="input col-span-3" placeholder="Amount" value={adjDraft.amount} onChange={e => setAdjDraft(s => ({ ...s, amount: e.target.value }))} />
                <input className="input col-span-3" placeholder="Note (optional)" value={adjDraft.note} onChange={e => setAdjDraft(s => ({ ...s, note: e.target.value }))} />
                <button className="btn-primary col-span-2" onClick={addAdj} disabled={!adjDraft.amount}><Plus size={16} /></button>
              </div>
              {guardAdjustments.length === 0 ? (
                <p className="text-xs text-ink-400">No adjustments yet.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {guardAdjustments.map(a => (
                    <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className={clsx('chip', a.type === 'advance' && 'bg-amber-100 text-amber-700', a.type === 'bonus' && 'bg-emerald-100 text-emerald-700', a.type === 'deduction' && 'bg-red-100 text-red-700')}>
                        {a.type}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-ink-600">{a.note || '—'}</span>
                      <span className="tabular-nums font-semibold">{money(a.amount, symbol)}</span>
                      <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => removeAdjustment(a.id)}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionHeader title="Payments" hint="Record cash or transfer paid to the guard for this month." />
              <div className="grid grid-cols-12 gap-2 mb-3">
                <input type="number" min="0" className="input col-span-3" placeholder="Amount" value={payDraft.amount} onChange={e => setPayDraft(s => ({ ...s, amount: e.target.value }))} />
                <input type="date" className="input col-span-3" value={payDraft.paidOn} onChange={e => setPayDraft(s => ({ ...s, paidOn: e.target.value }))} />
                <input className="input col-span-4" placeholder="Note (optional)" value={payDraft.note} onChange={e => setPayDraft(s => ({ ...s, note: e.target.value }))} />
                <button className="btn-primary col-span-2" onClick={addPay} disabled={!payDraft.amount}><Plus size={16} /></button>
              </div>
              {guardPayments.length === 0 ? (
                <p className="text-xs text-ink-400">No payments recorded.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {guardPayments.map(p => (
                    <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="chip bg-emerald-100 text-emerald-700">Paid</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ink-500">{fmtDate(p.paidOn)}</div>
                        <div className="text-ink-600 truncate">{p.note || '—'}</div>
                      </div>
                      <span className="tabular-nums font-semibold">{money(p.amount, symbol)}</span>
                      <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => removePayment(p.id)}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="text-base font-semibold text-ink-900 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-ink-400 tabular-nums">{hint}</div>}
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-ink-900">{title}</div>
      {hint && <div className="text-xs text-ink-400">{hint}</div>}
    </div>
  );
}
