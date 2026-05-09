import { useRef, useState } from 'react';
import { Download, Upload, Trash2, Save, Sparkles, AlertTriangle, Plus, CalendarDays } from 'lucide-react';
import { useStore, snapshot } from '../lib/store';
import { exportBackupXLSX, importBackupXLSX } from '../lib/io';
import { seedDemoData } from '../lib/seed';
import { format } from 'date-fns';
import { fmtDate, todayISO } from '../lib/format';

export default function Settings() {
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const replaceAll = useStore(s => s.replaceAll);
  const resetAll = useStore(s => s.resetAll);
  const holidays = useStore(s => s.holidays);
  const addHoliday = useStore(s => s.addHoliday);
  const removeHoliday = useStore(s => s.removeHoliday);

  const [draft, setDraft] = useState(settings);
  const [holDraft, setHolDraft] = useState({ date: todayISO(), name: '', paid: true });
  const fileInput = useRef<HTMLInputElement>(null);

  function save() {
    updateSettings(draft);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importBackupXLSX(file);
      if (!confirm(`Restore from "${file.name}"? This replaces all current data with: ${data.guards.length} guards, ${data.attendance.length} attendance entries.`)) return;
      replaceAll(data);
      alert('Restored.');
    } catch (err) {
      console.error(err);
      alert('Could not read that file. Make sure it is a GuardKeeper backup (.xlsx) exported by this app.');
    } finally {
      e.target.value = '';
    }
  }

  function onExport() {
    exportBackupXLSX(snapshot(), `GuardKeeper_Backup_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    updateSettings({ lastBackupAt: new Date().toISOString() });
  }

  function onSeed() {
    if (!confirm('Load sample workspace? This replaces any existing data.')) return;
    seedDemoData();
  }

  function onReset() {
    if (!confirm('Erase EVERYTHING — areas, guards, attendance, payments? This cannot be undone.')) return;
    if (!confirm('Final confirmation: erase all data?')) return;
    resetAll();
  }

  function addHol() {
    if (!holDraft.name.trim() || !holDraft.date) return;
    addHoliday({ date: holDraft.date, name: holDraft.name.trim(), paid: holDraft.paid });
    setHolDraft({ date: todayISO(), name: '', paid: true });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>
        <p className="text-ink-500 text-sm mt-1">Workspace details, holidays, and your data.</p>
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-900">Workspace</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Business name</label>
            <input className="input" value={draft.businessName} onChange={e => setDraft(s => ({ ...s, businessName: e.target.value }))} placeholder="e.g. Sentinel Security" />
          </div>
          <div>
            <label className="label">Owner name</label>
            <input className="input" value={draft.ownerName} onChange={e => setDraft(s => ({ ...s, ownerName: e.target.value }))} placeholder="Your name (printed on PDFs)" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={draft.currency} onChange={e => {
              const m: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$' };
              setDraft(s => ({ ...s, currency: e.target.value, currencySymbol: m[e.target.value] || s.currencySymbol }));
            }}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — Pound</option>
              <option value="AED">AED — Dirham</option>
              <option value="SGD">SGD — Singapore Dollar</option>
            </select>
          </div>
          <div>
            <label className="label">Currency symbol</label>
            <input className="input" value={draft.currencySymbol} onChange={e => setDraft(s => ({ ...s, currencySymbol: e.target.value }))} maxLength={3} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700 mt-1">
          <input type="checkbox" checked={draft.payOnHolidays} onChange={e => setDraft(s => ({ ...s, payOnHolidays: e.target.checked }))} />
          Pay guards for declared holidays even when not marked present
        </label>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save}><Save size={16} /> Save</button>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-1.5"><CalendarDays size={15} /> Holidays</h2>
          <span className="text-xs text-ink-400">{holidays.length} declared</span>
        </div>
        <p className="text-sm text-ink-500">Declare public holidays. With "Pay on holidays" enabled, guards get paid for holidays even when no attendance is marked.</p>
        <div className="grid grid-cols-12 gap-2">
          <input type="date" className="input col-span-4" value={holDraft.date} onChange={e => setHolDraft(s => ({ ...s, date: e.target.value }))} />
          <input className="input col-span-5" placeholder="Holiday name (e.g. Diwali)" value={holDraft.name} onChange={e => setHolDraft(s => ({ ...s, name: e.target.value }))} />
          <label className="col-span-2 flex items-center gap-1.5 text-xs text-ink-600">
            <input type="checkbox" checked={holDraft.paid} onChange={e => setHolDraft(s => ({ ...s, paid: e.target.checked }))} /> Paid
          </label>
          <button className="btn-primary col-span-1" onClick={addHol} disabled={!holDraft.name.trim()}><Plus size={16} /></button>
        </div>
        {holidays.length > 0 && (
          <ul className="divide-y divide-ink-100">
            {holidays.slice().sort((a, b) => b.date.localeCompare(a.date)).map(h => (
              <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="text-xs text-ink-400 w-24 tabular-nums">{fmtDate(h.date)}</span>
                <span className="flex-1 text-ink-800">{h.name}</span>
                <span className={`chip ${h.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>{h.paid ? 'Paid' : 'Unpaid'}</span>
                <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => removeHoliday(h.id)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Backup & restore</h2>
          {settings.lastBackupAt && (
            <span className="text-xs text-ink-400">Last backup: {fmtDate(settings.lastBackupAt)}</span>
          )}
        </div>
        <p className="text-sm text-ink-500">Everything is stored locally on this device. Export an Excel backup regularly so you have a copy you can keep in Drive, email to yourself, or restore later.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={onExport}><Download size={16} /> Export backup (.xlsx)</button>
          <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={onImport} />
          <button className="btn-secondary" onClick={() => fileInput.current?.click()}><Upload size={16} /> Restore from backup</button>
        </div>
        <p className="text-xs text-ink-400">Backups include areas, guards, attendance, uniforms, adjustments, payments, and holidays — across all time.</p>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-900">Sample data</h2>
        <p className="text-sm text-ink-500">Useful for demos or to see how the app feels with a few guards already set up.</p>
        <div>
          <button className="btn-secondary" onClick={onSeed}><Sparkles size={16} /> Load sample workspace</button>
        </div>
      </section>

      <section className="card p-5 space-y-3 ring-red-200">
        <h2 className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><AlertTriangle size={15} /> Danger zone</h2>
        <p className="text-sm text-ink-500">Erase all data on this device. Make sure you've exported a backup first.</p>
        <div>
          <button className="btn-danger" onClick={onReset}><Trash2 size={16} /> Erase everything</button>
        </div>
      </section>

      <p className="text-xs text-ink-400 pt-4">GuardKeeper • local-first attendance & payroll for security guards.</p>
    </div>
  );
}
