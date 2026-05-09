import type {
  AppData, SalaryComputation, AttendanceRecord, UniformIssue,
  SalaryAdjustment, SalaryPayment, Guard, Holiday,
} from '../types';
import { parseISO, getDay, isAfter, isSameDay } from 'date-fns';

function inMonth(date: string, ym: string) {
  return date.startsWith(ym);
}

function priorMonths(month: string, allMonths: string[]) {
  return allMonths.filter(m => m < month);
}

export function computeSalary(
  guard: Guard,
  ym: string,
  data: Pick<AppData, 'attendance' | 'uniforms' | 'adjustments' | 'payments' | 'holidays' | 'settings'>,
): SalaryComputation {
  const att: AttendanceRecord[] = data.attendance.filter(a => a.guardId === guard.id && inMonth(a.date, ym));
  let present = 0, half = 0, absent = 0, leave = 0;
  for (const a of att) {
    if (a.status === 'present') present++;
    else if (a.status === 'half') half++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'leave') leave++;
  }

  // Holidays paid (not marked absent or leave on a holiday-paid day)
  let holidayPaid = 0;
  if (data.settings.payOnHolidays) {
    const today = new Date();
    const monthHolidays = (data.holidays || []).filter((h: Holiday) => h.date.startsWith(ym) && h.paid);
    for (const h of monthHolidays) {
      const d = parseISO(h.date);
      if (isAfter(d, today) && !isSameDay(d, today)) continue;
      const rec = att.find(a => a.date === h.date);
      // already counted in present/half if marked. Only auto-pay when NOT marked anything (and not absent/leave).
      if (!rec) holidayPaid++;
    }
  }

  const workedUnits = present + half * 0.5 + holidayPaid;
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

  // Carry-forward outstanding advance:
  // Sum of all prior months: advances - net-paid-shortfall is complicated.
  // Simpler: outstanding = Σ advances across all months − Σ payments across all months tagged to those months − Σ "advance recovery" deductions.
  // We use: outstanding = total advances ever given − total amount paid back across all time (any payment in any month counts against advance pool).
  // But payments are for salary, so this is wrong. Use a clean definition:
  // outstanding_advance = total advances given to date that have NOT been recovered through net deductions.
  // Practically: total_advances_given - sum_of_advances_already_applied_in_net.
  // Since each month's advance is already applied to that month's net, the advance is "recovered" once net is paid.
  // We surface "balance > 0" already. But a real carry-forward concept = past month's unpaid net.
  // Simplest meaningful metric: sum of (net − paid) for all months prior to ym (where guard has activity).
  const allMonthsForGuard = new Set<string>([
    ...data.attendance.filter(a => a.guardId === guard.id).map(a => a.date.slice(0, 7)),
    ...data.adjustments.filter(a => a.guardId === guard.id).map(a => a.month),
    ...data.payments.filter(p => p.guardId === guard.id).map(p => p.month),
  ]);
  const prior = priorMonths(ym, [...allMonthsForGuard]);
  let outstandingAdvance = 0;
  for (const pm of prior) {
    // Compute net-balance for that prior month (recursively without further recursion needed — we just look at adjustments/payments)
    const ms = data.attendance.filter(a => a.guardId === guard.id && inMonth(a.date, pm));
    let p2 = 0, h2 = 0;
    for (const a of ms) {
      if (a.status === 'present') p2++;
      else if (a.status === 'half') h2++;
    }
    const units = p2 + h2 * 0.5;
    const grossM = units * guard.dailyRate;
    const uM = data.uniforms.filter(u => u.guardId === guard.id && inMonth(u.date, pm)).reduce((s, u) => s + (Number(u.cost) || 0), 0);
    const adjM = data.adjustments.filter(a => a.guardId === guard.id && a.month === pm);
    const advM = adjM.filter(a => a.type === 'advance').reduce((s, a) => s + a.amount, 0);
    const bonM = adjM.filter(a => a.type === 'bonus').reduce((s, a) => s + a.amount, 0);
    const dedM = adjM.filter(a => a.type === 'deduction').reduce((s, a) => s + a.amount, 0);
    const netM = grossM + bonM - uM - advM - dedM;
    const paidM = data.payments.filter(pp => pp.guardId === guard.id && pp.month === pm).reduce((s, p) => s + p.amount, 0);
    outstandingAdvance += Math.max(0, netM - paidM);
  }

  return {
    guardId: guard.id,
    presentDays: present,
    halfDays: half,
    absentDays: absent,
    leaveDays: leave,
    holidayPaidDays: holidayPaid,
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
    outstandingAdvance,
  };
}

export function isWeeklyOff(guard: Guard, dateISO: string): boolean {
  if (!guard.weeklyOff || guard.weeklyOff.length === 0) return false;
  const d = parseISO(dateISO);
  return guard.weeklyOff.includes(getDay(d) as any);
}

export function isHoliday(date: string, holidays: Holiday[]): Holiday | null {
  return holidays.find(h => h.date === date) || null;
}
