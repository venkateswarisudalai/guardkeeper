import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppData, Area, Guard, AttendanceRecord, AttendanceStatus,
  UniformIssue, SalaryAdjustment, SalaryPayment, Settings,
} from '../types';
import { uid } from './id';

const SCHEMA_VERSION = 1;

const defaultSettings: Settings = {
  ownerName: '',
  businessName: 'GuardKeeper',
  currency: 'INR',
  currencySymbol: '₹',
};

interface StoreState extends AppData {
  // Areas
  addArea: (a: Omit<Area, 'id' | 'createdAt'>) => Area;
  updateArea: (id: string, patch: Partial<Area>) => void;
  removeArea: (id: string) => void;
  // Guards
  addGuard: (g: Omit<Guard, 'id' | 'createdAt'>) => Guard;
  updateGuard: (id: string, patch: Partial<Guard>) => void;
  removeGuard: (id: string) => void;
  // Attendance
  setAttendance: (guardId: string, date: string, status: AttendanceStatus | null) => void;
  bulkSetAttendance: (guardIds: string[], date: string, status: AttendanceStatus) => void;
  // Uniforms
  addUniform: (u: Omit<UniformIssue, 'id'>) => UniformIssue;
  removeUniform: (id: string) => void;
  // Adjustments
  addAdjustment: (a: Omit<SalaryAdjustment, 'id' | 'createdAt'>) => SalaryAdjustment;
  removeAdjustment: (id: string) => void;
  // Payments
  addPayment: (p: Omit<SalaryPayment, 'id'>) => SalaryPayment;
  removePayment: (id: string) => void;
  // Settings
  updateSettings: (patch: Partial<Settings>) => void;
  // Bulk
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const initial: AppData = {
  version: SCHEMA_VERSION,
  settings: defaultSettings,
  areas: [],
  guards: [],
  attendance: [],
  uniforms: [],
  adjustments: [],
  payments: [],
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initial,

      addArea: (a) => {
        const area: Area = { ...a, id: uid('area'), createdAt: new Date().toISOString() };
        set(s => ({ areas: [...s.areas, area] }));
        return area;
      },
      updateArea: (id, patch) => set(s => ({
        areas: s.areas.map(a => a.id === id ? { ...a, ...patch } : a),
      })),
      removeArea: (id) => set(s => ({
        areas: s.areas.filter(a => a.id !== id),
        guards: s.guards.map(g => g.areaId === id ? { ...g, areaId: '' } : g),
      })),

      addGuard: (g) => {
        const guard: Guard = { ...g, id: uid('grd'), createdAt: new Date().toISOString() };
        set(s => ({ guards: [...s.guards, guard] }));
        return guard;
      },
      updateGuard: (id, patch) => set(s => ({
        guards: s.guards.map(g => g.id === id ? { ...g, ...patch } : g),
      })),
      removeGuard: (id) => set(s => ({
        guards: s.guards.filter(g => g.id !== id),
        attendance: s.attendance.filter(a => a.guardId !== id),
        uniforms: s.uniforms.filter(u => u.guardId !== id),
        adjustments: s.adjustments.filter(a => a.guardId !== id),
        payments: s.payments.filter(p => p.guardId !== id),
      })),

      setAttendance: (guardId, date, status) => set(s => {
        const filtered = s.attendance.filter(a => !(a.guardId === guardId && a.date === date));
        if (status === null) return { attendance: filtered };
        return {
          attendance: [...filtered, {
            id: `${guardId}_${date}`, guardId, date, status,
          }],
        };
      }),
      bulkSetAttendance: (guardIds, date, status) => set(s => {
        const set_ = new Set(guardIds);
        const filtered = s.attendance.filter(a => !(set_.has(a.guardId) && a.date === date));
        const newRecs: AttendanceRecord[] = guardIds.map(guardId => ({
          id: `${guardId}_${date}`, guardId, date, status,
        }));
        return { attendance: [...filtered, ...newRecs] };
      }),

      addUniform: (u) => {
        const rec: UniformIssue = { ...u, id: uid('uni') };
        set(s => ({ uniforms: [...s.uniforms, rec] }));
        return rec;
      },
      removeUniform: (id) => set(s => ({ uniforms: s.uniforms.filter(u => u.id !== id) })),

      addAdjustment: (a) => {
        const rec: SalaryAdjustment = { ...a, id: uid('adj'), createdAt: new Date().toISOString() };
        set(s => ({ adjustments: [...s.adjustments, rec] }));
        return rec;
      },
      removeAdjustment: (id) => set(s => ({ adjustments: s.adjustments.filter(a => a.id !== id) })),

      addPayment: (p) => {
        const rec: SalaryPayment = { ...p, id: uid('pay') };
        set(s => ({ payments: [...s.payments, rec] }));
        return rec;
      },
      removePayment: (id) => set(s => ({ payments: s.payments.filter(p => p.id !== id) })),

      updateSettings: (patch) => set(s => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (data) => set({
        version: data.version ?? SCHEMA_VERSION,
        settings: { ...defaultSettings, ...(data.settings || {}) },
        areas: data.areas || [],
        guards: data.guards || [],
        attendance: data.attendance || [],
        uniforms: data.uniforms || [],
        adjustments: data.adjustments || [],
        payments: data.payments || [],
      }),
      resetAll: () => set({ ...initial }),
    }),
    {
      name: 'guardkeeper-v1',
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
    },
  ),
);

export function snapshot(): AppData {
  const s = useStore.getState();
  return {
    version: s.version,
    settings: s.settings,
    areas: s.areas,
    guards: s.guards,
    attendance: s.attendance,
    uniforms: s.uniforms,
    adjustments: s.adjustments,
    payments: s.payments,
  };
}
