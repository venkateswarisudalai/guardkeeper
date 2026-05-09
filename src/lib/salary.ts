import type {
  AppData, SalaryComputation, AttendanceRecord, UniformIssue,
  SalaryAdjustment, SalaryPayment, Guard,
} from '../types';

function inMonth(date: string, ym: string) {
  return date.startsWith(ym);
}

export function computeSalary(
  guard: Guard,
  ym: string,
  data: Pick<AppData, 'attendance' | 'uniforms' | 'adjustments' | 'payments'>,
): SalaryComputation {
  const att: AttendanceRecord[] = data.attendance.filter(a => a.guardId === guard.id && inMonth(a.date, ym));
  let present = 0, half = 0, absent = 0, leave = 0;
  for (const a of att) {
    if (a.status === 'present') present++;
    else if (a.status === 'half') half++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'leave') leave++;
  }
  const workedUnits = present + half * 0.5;
  const gross = workedUnits * guard.dailyRate;

  const uniforms: UniformIssue[] = data.uniforms.filter(u => u.guardId === guard.id && inMonth(u.date, ym));
  const uniformDeduction = uniforms.reduce((s, u) => s + (Number(u.cost) || 0), 0);

  const adjs: SalaryAdjustment[] = data.adjustments.filter(a => a.guardId === guard.id && a.month === ym);
  const advances = adjs.filter(a => a.type === 'advance').reduce((s, a) => s + a.amount, 0);
  const bonuses = adjs.filter(a => a.type === 'bonus').reduce((s, a) => s + a.amount, 0);
  const otherDeductions = adjs.filter(a => a.type === 'deduction').reduce((s, a) => s + a.amount, 0);

  const net = gross + bonuses - uniformDeduction - advances - otherDeductions;

  const pays: SalaryPayment[] = data.payments.filter(p => p.guardId === guard.id && p.month === ym);
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  const balance = net - paid;

  return {
    guardId: guard.id,
    presentDays: present,
    halfDays: half,
    absentDays: absent,
    leaveDays: leave,
    workedUnits,
    dailyRate: guard.dailyRate,
    gross,
    uniformDeduction,
    advances,
    bonuses,
    otherDeductions,
    net,
    paid,
    balance,
  };
}
