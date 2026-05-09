import { useMemo, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import type { Area } from '../types';

export default function Areas() {
  const areas = useStore(s => s.areas);
  const guards = useStore(s => s.guards);
  const addArea = useStore(s => s.addArea);
  const updateArea = useStore(s => s.updateArea);
  const removeArea = useStore(s => s.removeArea);

  const [editing, setEditing] = useState<Partial<Area> | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of guards) if (g.active) m.set(g.areaId, (m.get(g.areaId) || 0) + 1);
    return m;
  }, [guards]);

  function save() {
    if (!editing?.name?.trim()) return;
    if (editing.id) {
      updateArea(editing.id, { name: editing.name.trim(), address: editing.address?.trim() });
    } else {
      addArea({ name: editing.name.trim(), address: editing.address?.trim() });
    }
    setEditing(null);
  }

  function onDelete(area: Area) {
    const count = counts.get(area.id) ?? 0;
    const msg = count > 0
      ? `Delete "${area.name}"? Its ${count} guard${count === 1 ? '' : 's'} will become unassigned (you can move them later).`
      : `Delete "${area.name}"?`;
    if (confirm(msg)) removeArea(area.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Areas</h1>
          <p className="text-ink-500 text-sm mt-1">The sites and properties you manage. Each guard is assigned to one area.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add area</button>
      </div>

      {areas.length === 0 ? (
        <EmptyState
          icon={<MapPin size={20} />}
          title="No areas yet"
          body="Add the first site you cover — apartments, an office building, or a gated community."
          action={<button className="btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add area</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => {
            const c = counts.get(area.id) ?? 0;
            return (
              <div key={area.id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900 truncate">{area.name}</div>
                    {area.address && <div className="text-xs text-ink-400 mt-0.5 truncate">{area.address}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost p-1.5" onClick={() => setEditing(area)} aria-label="Edit"><Pencil size={15} /></button>
                    <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => onDelete(area)} aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="chip bg-ink-100 text-ink-700">{c} active guard{c === 1 ? '' : 's'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit area' : 'Add area'}
        description="Name your site and optionally add an address for your records."
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!editing?.name?.trim()}>Save</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              autoFocus
              value={editing?.name ?? ''}
              onChange={e => setEditing(s => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Lakeview Apartments"
            />
          </div>
          <div>
            <label className="label">Address (optional)</label>
            <input
              className="input"
              value={editing?.address ?? ''}
              onChange={e => setEditing(s => ({ ...s, address: e.target.value }))}
              placeholder="Street, neighbourhood…"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
