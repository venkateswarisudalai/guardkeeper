import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppData, Guard, SalaryComputation } from '../types';
import { computeSalary } from './salary';
import { monthLabel, money, fmtDate } from './format';

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
  };
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
