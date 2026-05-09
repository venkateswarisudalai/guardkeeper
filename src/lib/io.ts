import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppData, Guard, SalaryComputation, AttendanceRecord, Holiday } from '../types';
import { computeSalary } from './salary';
import { monthLabel, money, fmtDate } from './format';
import { parseISO, getDaysInMonth } from 'date-fns';

export function exportBackupXLSX(data: AppData, filename: string) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
    version: data.version,
    ownerName: data.settings.ownerName,
    businessName: data.settings.businessName,
    currency: data.settings.currency,
    currencySymbol: data.settings.currencySymbol,
    exportedAt: new Date().toISOString(),
  }]), 'meta');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.areas), 'areas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.guards), 'guards');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.attendance), 'attendance');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.uniforms), 'uniforms');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.adjustments), 'adjustments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.payments), 'payments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.holidays || []), 'holidays');

  XLSX.writeFile(wb, filename);
}

export async function importBackupXLSX(file: File): Promise<AppData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const sheet = (name: string) => {
    const s = wb.Sheets[name];
    if (!s) return [];
    return XLSX.utils.sheet_to_json<any>(s, { defval: '' });
  };

  const meta = sheet('meta')[0] || {};
  return {
    version: Number(meta.version) || 1,
    settings: {
      ownerName: meta.ownerName || '',
      businessName: meta.businessName || 'GuardKeeper',
      currency: meta.currency || 'INR',
      currencySymbol: meta.currencySymbol || '₹',
      payOnHolidays: meta.payOnHolidays === false ? false : true,
      lastBackupAt: meta.lastBackupAt || undefined,
    },
    areas: sheet('areas'),
    guards: sheet('guards').map((g: any) => ({
      ...g,
      dailyRate: Number(g.dailyRate) || 0,
      active: g.active === true || g.active === 'true' || g.active === 1,
    })),
    attendance: sheet('attendance'),
    uniforms: sheet('uniforms').map((u: any) => ({ ...u, cost: Number(u.cost) || 0 })),
    adjustments: sheet('adjustments').map((a: any) => ({ ...a, amount: Number(a.amount) || 0 })),
    payments: sheet('payments').map((p: any) => ({ ...p, amount: Number(p.amount) || 0 })),
    holidays: sheet('holidays').map((h: any) => ({ ...h, paid: h.paid === true || h.paid === 'true' || h.paid === 1 })),
  };
}

// Notebook-style monthly register: rows = guards, cols = days
export function exportMonthlyRegisterPDF(
  guards: Guard[],
  areaNameOf: (g: Guard) => string,
  attendance: AttendanceRecord[],
  holidays: Holiday[],
  ym: string,
  businessName: string,
  ownerName: string,
) {
  const monthStart = parseISO(`${ym}-01`);
  const days = getDaysInMonth(monthStart);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(businessName || 'GuardKeeper', 40, 50);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Monthly Attendance Register — ${monthLabel(ym)}`, 40, 68);
  if (ownerName) doc.text(`Owner: ${ownerName}`, 40, 84);
  doc.setTextColor(140);
  doc.text(`Generated ${fmtDate(new Date().toISOString())}`, pageW - 40, 50, { align: 'right' });

  const head = [['#', 'Guard', 'Area', ...Array.from({ length: days }, (_, i) => String(i + 1)), 'P', 'H', 'A', 'L']];

  const holidaySet = new Set(holidays.filter(h => h.date.startsWith(ym)).map(h => h.date));

  const body = guards.map((g, idx) => {
    const row: string[] = [String(idx + 1), g.name, areaNameOf(g)];
    let p = 0, h = 0, a = 0, l = 0;
    for (let d = 1; d <= days; d++) {
      const iso = `${ym}-${String(d).padStart(2, '0')}`;
      const rec = attendance.find(r => r.guardId === g.id && r.date === iso);
      let cell = '';
      if (rec) {
        cell = rec.status === 'present' ? 'P' : rec.status === 'half' ? 'H' : rec.status === 'leave' ? 'L' : 'A';
        if (rec.status === 'present') p++;
        else if (rec.status === 'half') h++;
        else if (rec.status === 'leave') l++;
        else if (rec.status === 'absent') a++;
      } else if (holidaySet.has(iso)) {
        cell = '★';
      }
      row.push(cell);
    }
    row.push(String(p), String(h), String(a), String(l));
    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: 105,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [15, 17, 22], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 110, halign: 'left' },
      2: { cellWidth: 90, halign: 'left' },
    },
    didParseCell: (hook) => {
      if (hook.section !== 'body') return;
      const c = hook.cell.text[0];
      if (c === 'P') hook.cell.styles.fillColor = [220, 252, 231];
      else if (c === 'H') hook.cell.styles.fillColor = [254, 243, 199];
      else if (c === 'A') hook.cell.styles.fillColor = [254, 226, 226];
      else if (c === 'L') hook.cell.styles.fillColor = [219, 234, 254];
      else if (c === '★') hook.cell.styles.fillColor = [243, 232, 255];
    },
    margin: { left: 30, right: 30 },
  });

  doc.setFontSize(9); doc.setTextColor(120);
  const finalY = (doc as any).lastAutoTable.finalY + 16;
  doc.text('Legend:  P = Present (green)   H = Half day (amber)   A = Absent (red)   L = Leave (blue)   ★ = Holiday (purple)', 40, finalY);

  doc.save(`Attendance_Register_${ym}.pdf`);
}

// CSV bulk import for guards.
// Expected columns (header row): name, phone, area, dailyRate, joinDate, weeklyOff
// 'area' is matched against existing areas by name (case-insensitive).
// 'weeklyOff' is comma-or-pipe-separated weekday names (e.g. "Sun" or "Sun|Wed") or numbers 0-6.
export interface CsvImportResult {
  guards: Array<Omit<Guard, 'id' | 'createdAt'>>;
  errors: string[];
}

const dayMap: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

export function parseGuardsCSV(text: string, areas: { id: string; name: string }[], defaultJoin: string): CsvImportResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { guards: [], errors: ['Empty file.'] };
  const split = (s: string) => s.split(',').map(x => x.trim().replace(/^"|"$/g, ''));
  const header = split(lines[0]).map(h => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iName = idx('name'), iPhone = idx('phone'), iArea = idx('area');
  const iRate = idx('dailyrate') >= 0 ? idx('dailyrate') : idx('rate');
  const iJoin = idx('joindate'); const iOff = idx('weeklyoff');
  if (iName < 0 || iArea < 0 || iRate < 0) {
    return { guards: [], errors: ['CSV must include columns: name, area, dailyRate (and optionally phone, joinDate, weeklyOff).'] };
  }
  const errors: string[] = [];
  const out: Array<Omit<Guard, 'id' | 'createdAt'>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    const name = cols[iName];
    if (!name) { errors.push(`Row ${i + 1}: missing name`); continue; }
    const areaName = cols[iArea] || '';
    const area = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
    if (!area) { errors.push(`Row ${i + 1}: area "${areaName}" not found — create it first`); continue; }
    const rate = Number(cols[iRate]);
    if (!rate || rate <= 0) { errors.push(`Row ${i + 1}: invalid dailyRate "${cols[iRate]}"`); continue; }
    let weeklyOff: any[] = [];
    if (iOff >= 0 && cols[iOff]) {
      weeklyOff = cols[iOff].split(/[|;]/).map(t => t.trim()).map(t => {
        const n = Number(t);
        if (!isNaN(n) && n >= 0 && n <= 6) return n;
        return dayMap[t.toLowerCase()];
      }).filter(n => typeof n === 'number');
    }
    out.push({
      name,
      phone: iPhone >= 0 ? cols[iPhone] || '' : '',
      areaId: area.id,
      dailyRate: rate,
      joinDate: (iJoin >= 0 && cols[iJoin]) ? cols[iJoin] : defaultJoin,
      active: true,
      weeklyOff,
      notes: '',
    });
  }
  return { guards: out, errors };
}

export function whatsappUrl(phone: string, text: string): string {
  // Strip non-digits for wa.me; assume phone already has country code where applicable.
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildSalaryShareText(guard: Guard, areaName: string, ym: string, calc: SalaryComputation, businessName: string, symbol: string) {
  const lines = [
    `*${businessName || 'Salary Slip'}* — ${monthLabel(ym)}`,
    `Guard: *${guard.name}*`,
    `Area: ${areaName}`,
    ``,
    `Daily rate: ${money(calc.dailyRate, symbol)}`,
    `Days worked: ${calc.workedUnits} (P${calc.presentDays} H${calc.halfDays} A${calc.absentDays} L${calc.leaveDays})`,
    `Gross: ${money(calc.gross, symbol)}`,
  ];
  if (calc.uniformDeduction) lines.push(`Uniform: −${money(calc.uniformDeduction, symbol)}`);
  if (calc.advances) lines.push(`Advance: −${money(calc.advances, symbol)}`);
  if (calc.otherDeductions) lines.push(`Other deduction: −${money(calc.otherDeductions, symbol)}`);
  if (calc.bonuses) lines.push(`Bonus: +${money(calc.bonuses, symbol)}`);
  lines.push(``, `*Net payable: ${money(calc.net, symbol)}*`);
  if (calc.paid) lines.push(`Paid: ${money(calc.paid, symbol)}`);
  if (calc.balance > 0) lines.push(`Balance: ${money(calc.balance, symbol)}`);
  return lines.join('\n');
}

export function exportMonthSalaryXLSX(
  rows: Array<{ guard: Guard; areaName: string; calc: SalaryComputation }>,
  ym: string,
  filename: string,
  symbol: string,
) {
  const wb = XLSX.utils.book_new();
  const data = rows.map(({ guard, areaName, calc }) => ({
    Name: guard.name,
    Phone: guard.phone || '',
    Area: areaName,
    'Daily Rate': calc.dailyRate,
    Present: calc.presentDays,
    'Half Day': calc.halfDays,
    Absent: calc.absentDays,
    Leave: calc.leaveDays,
    'Worked Units': calc.workedUnits,
    Gross: calc.gross,
    Uniform: calc.uniformDeduction,
    Advance: calc.advances,
    Bonus: calc.bonuses,
    'Other Deduction': calc.otherDeductions,
    Net: calc.net,
    Paid: calc.paid,
    Balance: calc.balance,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 12 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, monthLabel(ym));

  // Add header banner via aoa
  const totals = data.reduce((acc, r) => ({
    gross: acc.gross + (r.Gross || 0),
    net: acc.net + (r.Net || 0),
    paid: acc.paid + (r.Paid || 0),
    balance: acc.balance + (r.Balance || 0),
  }), { gross: 0, net: 0, paid: 0, balance: 0 });
  const summary = [
    { Metric: 'Month', Value: monthLabel(ym) },
    { Metric: 'Currency', Value: symbol },
    { Metric: 'Guards', Value: data.length },
    { Metric: 'Total Gross', Value: totals.gross },
    { Metric: 'Total Net', Value: totals.net },
    { Metric: 'Total Paid', Value: totals.paid },
    { Metric: 'Outstanding Balance', Value: totals.balance },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
  XLSX.writeFile(wb, filename);
}

export function exportMonthSalaryPDF(
  rows: Array<{ guard: Guard; areaName: string; calc: SalaryComputation }>,
  ym: string,
  filename: string,
  symbol: string,
  businessName: string,
  ownerName: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(businessName || 'GuardKeeper', 40, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Salary Statement — ${monthLabel(ym)}`, 40, 68);
  if (ownerName) doc.text(`Owner: ${ownerName}`, 40, 84);
  doc.setTextColor(140);
  doc.text(`Generated ${fmtDate(new Date().toISOString())}`, pageW - 40, 50, { align: 'right' });

  const head = [['Guard', 'Area', 'Rate', 'P', 'H', 'A', 'L', 'Units', 'Gross', 'Uniform', 'Adv', 'Bonus', 'Ded', 'Net', 'Paid', 'Balance']];
  const body = rows.map(({ guard, areaName, calc }) => ([
    guard.name, areaName, money(calc.dailyRate, symbol),
    String(calc.presentDays), String(calc.halfDays), String(calc.absentDays), String(calc.leaveDays),
    String(calc.workedUnits),
    money(calc.gross, symbol),
    money(calc.uniformDeduction, symbol),
    money(calc.advances, symbol),
    money(calc.bonuses, symbol),
    money(calc.otherDeductions, symbol),
    money(calc.net, symbol),
    money(calc.paid, symbol),
    money(calc.balance, symbol),
  ]));
  const totals = rows.reduce((acc, { calc }) => ({
    gross: acc.gross + calc.gross,
    uniform: acc.uniform + calc.uniformDeduction,
    adv: acc.adv + calc.advances,
    bonus: acc.bonus + calc.bonuses,
    ded: acc.ded + calc.otherDeductions,
    net: acc.net + calc.net,
    paid: acc.paid + calc.paid,
    balance: acc.balance + calc.balance,
  }), { gross: 0, uniform: 0, adv: 0, bonus: 0, ded: 0, net: 0, paid: 0, balance: 0 });

  autoTable(doc, {
    head,
    body,
    startY: 105,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [15, 17, 22], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 247, 248] },
    foot: [['Totals', '', '', '', '', '', '', '',
      money(totals.gross, symbol),
      money(totals.uniform, symbol),
      money(totals.adv, symbol),
      money(totals.bonus, symbol),
      money(totals.ded, symbol),
      money(totals.net, symbol),
      money(totals.paid, symbol),
      money(totals.balance, symbol),
    ]],
    footStyles: { fillColor: [238, 238, 240], textColor: 20, fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
  });

  doc.save(filename);
}

export function downloadSlipPDF(
  guard: Guard,
  areaName: string,
  ym: string,
  calc: SalaryComputation,
  symbol: string,
  businessName: string,
  ownerName: string,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(businessName || 'GuardKeeper', 40, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text('Salary Slip', 40, 80);
  doc.setTextColor(140);
  doc.text(`${monthLabel(ym)}`, pageW - 40, 60, { align: 'right' });
  if (ownerName) doc.text(`Owner: ${ownerName}`, pageW - 40, 76, { align: 'right' });

  doc.setDrawColor(220);
  doc.line(40, 95, pageW - 40, 95);

  doc.setTextColor(20);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(guard.name, 40, 125);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Area: ${areaName}`, 40, 142);
  if (guard.phone) doc.text(`Phone: ${guard.phone}`, 40, 156);
  doc.text(`Joined: ${fmtDate(guard.joinDate)}`, 40, 170);

  autoTable(doc, {
    startY: 195,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
    body: [
      ['Daily rate', money(calc.dailyRate, symbol)],
      ['Present days', String(calc.presentDays)],
      ['Half days', String(calc.halfDays)],
      ['Absent days', String(calc.absentDays)],
      ['Leave', String(calc.leaveDays)],
      ['Worked units', String(calc.workedUnits)],
    ],
    columnStyles: { 0: { textColor: 90 }, 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: [15, 17, 22], textColor: 255 },
    head: [['Earnings & Deductions', 'Amount']],
    body: [
      ['Gross (units × rate)', money(calc.gross, symbol)],
      ['+ Bonus', money(calc.bonuses, symbol)],
      ['− Uniform', money(calc.uniformDeduction, symbol)],
      ['− Advance', money(calc.advances, symbol)],
      ['− Other deduction', money(calc.otherDeductions, symbol)],
      ['Net payable', money(calc.net, symbol)],
      ['Paid', money(calc.paid, symbol)],
      ['Balance', money(calc.balance, symbol)],
    ],
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Generated on ${fmtDate(new Date().toISOString())} • GuardKeeper`, 40, doc.internal.pageSize.getHeight() - 30);

  doc.save(`Salary_${guard.name.replace(/\s+/g, '_')}_${ym}.pdf`);
}

export function computeAllSalaries(
  guards: Guard[],
  ym: string,
  data: AppData,
): SalaryComputation[] {
  return guards.map(g => computeSalary(g, ym, data));
}
