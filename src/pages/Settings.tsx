import { useRef, useState } from 'react';
import { Download, Upload, Trash2, Save, Sparkles, AlertTriangle } from 'lucide-react';
import { useStore, snapshot } from '../lib/store';
import { exportBackupXLSX, importBackupXLSX } from '../lib/io';
import { seedDemoData } from '../lib/seed';
import { format } from 'date-fns';

export default function Settings() {
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const replaceAll = useStore(s => s.replaceAll);
  const resetAll = useStore(s => s.resetAll);

  const [draft, setDraft] = useState(settings);
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>
        <p className="text-ink-500 text-sm mt-1">Workspace details and your data.</p>
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
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save}><Save size={16} /> Save</button>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-900">Backup & restore</h2>
        <p className="text-sm text-ink-500">Everything is stored locally on this device. Export an Excel backup regularly so you have a copy you can keep in Drive, email to yourself, or restore later.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={onExport}><Download size={16} /> Export backup (.xlsx)</button>
          <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={onImport} />
          <button className="btn-secondary" onClick={() => fileInput.current?.click()}><Upload size={16} /> Restore from backup</button>
        </div>
        <p className="text-xs text-ink-400">Backups include areas, guards, attendance, uniforms, adjustments, and payments — across all time.</p>
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
