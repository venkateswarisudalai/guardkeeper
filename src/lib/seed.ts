import { useStore } from './store';
import { format, subDays } from 'date-fns';
import { uid } from './id';

export function seedDemoData() {
  const s = useStore.getState();
  s.resetAll();

  const today = new Date();
  const join = format(subDays(today, 120), 'yyyy-MM-dd');

  s.addHoliday({ date: `${format(today, 'yyyy-MM')}-15`, name: 'Mid-month holiday (sample)', paid: true });
  const a1 = s.addArea({ name: 'Lakeview Apartments', address: 'JP Nagar, Block 4' });
  const a2 = s.addArea({ name: 'Maple Heights', address: 'HSR Layout, Sector 2' });
  const a3 = s.addArea({ name: 'Pearl Tower Office', address: 'Whitefield Main Rd' });

  const guards = [
    { name: 'Ramesh Kumar', phone: '+91 98450 12345', areaId: a1.id, dailyRate: 650 },
    { name: 'Suresh Yadav', phone: '+91 98450 22345', areaId: a1.id, dailyRate: 650 },
    { name: 'Mahadev Singh', phone: '+91 98450 32345', areaId: a1.id, dailyRate: 700 },
    { name: 'Karan Sharma', phone: '+91 98450 42345', areaId: a2.id, dailyRate: 600 },
    { name: 'Vinod Patel', phone: '+91 98450 52345', areaId: a2.id, dailyRate: 600 },
    { name: 'Arjun Reddy', phone: '+91 98450 62345', areaId: a3.id, dailyRate: 750 },
    { name: 'Mohan Rao', phone: '+91 98450 72345', areaId: a3.id, dailyRate: 750 },
  ];
  const created = guards.map(g => s.addGuard({ ...g, joinDate: join, active: true }));

  // Populate attendance for the last 30 days
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(today, i), 'yyyy-MM-dd');
    for (const g of created) {
      const r = Math.random();
      const status = r < 0.85 ? 'present' : r < 0.92 ? 'half' : r < 0.97 ? 'leave' : 'absent';
      s.setAttendance(g.id, d, status as any);
    }
  }

  // Uniforms for two guards
  s.addUniform({ guardId: created[0].id, date: format(subDays(today, 12), 'yyyy-MM-dd'), item: 'Shirt + trouser set', cost: 950 });
  s.addUniform({ guardId: created[3].id, date: format(subDays(today, 5), 'yyyy-MM-dd'), item: 'Shoes', cost: 700 });

  // One advance
  s.addAdjustment({
    guardId: created[1].id,
    month: format(today, 'yyyy-MM'),
    type: 'advance',
    amount: 2000,
    note: 'Family event advance',
  });

  return created.length;
}

export { uid };
