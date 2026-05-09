import { useMemo, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Phone, Search, Power, Shirt } from 'lucide-react';
import { useStore } from '../lib/store';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Avatar } from '../components/Avatar';
import { money, fmtDate, todayISO } from '../lib/format';
import type { Guard } from '../types';

interface Draft extends Partial<Guard> {}

export default function Guards() {
  const guards = useStore(s => s.guards);
  const areas = useStore(s => s.areas);
  const addGuard = useStore(s => s.addGuard);
  const updateGuard = useStore(s => s.updateGuard);
  const removeGuard = useStore(s => s.removeGuard);
  const uniforms = useStore(s => s.uniforms);
  const addUniform = useStore(s => s.addUniform);
  const removeUniform = useStore(s => s.removeUniform);
  const symbol = useStore(s => s.settings.currencySymbol);

  const [filterArea, setFilterArea] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [uniformFor, setUniformFor] = useState<Guard | null>(null);
  const [uniformDraft, setUniformDraft] = useState<{ date: string; item: string; cost: string }>({ date: todayISO(), item: '', cost: '' });

  const filtered = useMemo(() => {
    return guards.filter(g => {
      if (filterArea && g.areaId !== filterArea) return false;
      if (filterActive === 'active' && !g.active) return false;
      if (filterActive === 'inactive' && g.active) return false;
      if (query && !g.name.toLowerCase().includes(query.toLowerCase()) && !(g.phone || '').includes(query)) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [guards, filterArea, filterActive, query]);

  const guardUniforms = (guardId: string) => uniforms.filter(u => u.guardId === guardId).sort((a, b) => b.date.localeCompare(a.date));

  function save() {
    if (!editing?.name?.trim() || !editing.areaId) return;
    const payload = {
      name: editing.name.trim(),
      phone: editing.phone?.trim() || '',
      areaId: editing.areaId,
      dailyRate: Number(editing.dailyRate) || 0,
      joinDate: editing.joinDate || todayISO(),
      active: editing.active ?? true,
      notes: editing.notes?.trim() || '',
    };
    if (editing.id) updateGuard(editing.id, payload);
    else addGuard(payload);
    setEditing(null);
  }

  function onDelete(g: Guard) {
    if (confirm(`Delete ${g.name}? This removes their attendance, uniforms and salary records permanently.`)) {
      removeGuard(g.id);
    }
  }

  function addUniformIssue() {
    if (!uniformFor || !uniformDraft.item.trim()) return;
    addUniform({
      guardId: uniformFor.id,
      date: uniformDraft.date,
      item: uniformDraft.item.trim(),
      cost: Number(uniformDraft.cost) || 0,
    });
    setUniformDraft({ date: todayISO(), item: '', cost: '' });
  }

  if (areas.length === 0 && guards.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink-900">Guards</h1>
        <EmptyState
          icon={<Users size={20} />}
          title="Create an area first"
          body="Each guard belongs to an area (a site you manage). Add at least one area before adding guards."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Guards</h1>
          <p className="text-ink-500 text-sm mt-1">{guards.filter(g => g.active).length} active • {guards.filter(g => !g.active).length} inactive</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ active: true, joinDate: todayISO(), dailyRate: 600, areaId: areas[0]?.id })} disabled={areas.length === 0}>
          <Plus size={16} /> Add guard
        </button>
      </div>

      <div className="card p-3 md:p-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search by name or phone" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
          <option value="">All areas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="input max-w-[150px]" value={filterActive} onChange={e => setFilterActive(e.target.value as any)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No guards match"
          body={guards.length === 0 ? 'Add your first guard to start.' : 'Try clearing filters.'}
          action={guards.length === 0 ? <button className="btn-primary" onClick={() => setEditing({ active: true, joinDate: todayISO(), dailyRate: 600, areaId: areas[0]?.id })}><Plus size={16} /> Add guard</button> : null}
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-ink-100">
            {filtered.map(g => {
              const area = areas.find(a => a.id === g.areaId)?.name ?? '—';
              return (
                <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={g.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-ink-900 truncate">{g.name}</div>
                      {!g.active && <span className="chip bg-ink-100 text-ink-500">Inactive</span>}
                    </div>
                    <div className="text-xs text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                      <span>{area}</span>
                      {g.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{g.phone}</span>}
                      <span>Joined {fmtDate(g.joinDate)}</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-ink-900 tabular-nums">{money(g.dailyRate, symbol)}/day</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost p-1.5" title="Issue uniform" onClick={() => { setUniformFor(g); setUniformDraft({ date: todayISO(), item: '', cost: '' }); }}><Shirt size={15} /></button>
                    <button className="btn-ghost p-1.5" title={g.active ? 'Mark inactive' : 'Mark active'} onClick={() => updateGuard(g.id, { active: !g.active })}><Power size={15} /></button>
                    <button className="btn-ghost p-1.5" title="Edit" onClick={() => setEditing(g)}><Pencil size={15} /></button>
                    <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" title="Delete" onClick={() => onDelete(g)}><Trash2 size={15} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit guard' : 'Add guard'}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!editing?.name?.trim() || !editing?.areaId}>Save</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input autoFocus className="input" value={editing?.name ?? ''} onChange={e => setEditing(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={editing?.phone ?? ''} onChange={e => setEditing(s => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Daily rate ({useStore.getState().settings.currencySymbol})</label>
              <input type="number" min="0" className="input" value={editing?.dailyRate ?? 0} onChange={e => setEditing(s => ({ ...s, dailyRate: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Area</label>
              <select className="input" value={editing?.areaId ?? ''} onChange={e => setEditing(s => ({ ...s, areaId: e.target.value }))}>
                <option value="" disabled>Choose area</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Join date</label>
              <input type="date" className="input" value={editing?.joinDate ?? todayISO()} onChange={e => setEditing(s => ({ ...s, joinDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={2} className="input" value={editing?.notes ?? ''} onChange={e => setEditing(s => ({ ...s, notes: e.target.value }))} />
          </div>
          {editing?.id && (
            <label className="flex items-center gap-2 text-sm text-ink-700 mt-1">
              <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing(s => ({ ...s, active: e.target.checked }))} />
              Active
            </label>
          )}
        </div>
      </Modal>

      <Modal
        open={!!uniformFor}
        onClose={() => setUniformFor(null)}
        title={uniformFor ? `Uniform — ${uniformFor.name}` : ''}
        description="Record uniform items issued. Costs are deducted from the salary in that month."
      >
        {uniformFor && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="label">Item</label>
                <input className="input" placeholder="e.g. Shirt + trouser" value={uniformDraft.item} onChange={e => setUniformDraft(s => ({ ...s, item: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cost</label>
                <input type="number" min="0" className="input" value={uniformDraft.cost} onChange={e => setUniformDraft(s => ({ ...s, cost: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={uniformDraft.date} onChange={e => setUniformDraft(s => ({ ...s, date: e.target.value }))} />
              </div>
              <div className="col-span-2 flex items-end">
                <button className="btn-primary w-full" onClick={addUniformIssue} disabled={!uniformDraft.item.trim()}><Plus size={16} /> Issue</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">History</div>
              {guardUniforms(uniformFor.id).length === 0 ? (
                <p className="text-sm text-ink-400">Nothing issued yet.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {guardUniforms(uniformFor.id).map(u => (
                    <li key={u.id} className="flex items-center gap-3 py-2">
                      <Shirt size={16} className="text-ink-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink-900 truncate">{u.item}</div>
                        <div className="text-xs text-ink-400">{fmtDate(u.date)}</div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">{money(u.cost, symbol)}</div>
                      <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => removeUniform(u.id)}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
