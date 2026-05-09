# GuardKeeper

A quiet, local-first attendance and salary app for owners who manage security guards across multiple sites.

Replaces the handwritten "name + tick + salary" register notebook with something that:

- Tracks **attendance** day-by-day per guard (Present / Half / Leave / Absent).
- Manages **areas** — apartments, offices, gated communities — with their own roster of guards.
- Records **uniform issues** and deducts the cost from that month's salary automatically.
- Computes **monthly salary** based on days worked, with advances, bonuses, and other deductions.
- Lets you **export an Excel backup** of everything, or download a **PDF salary slip / monthly statement** for your records.
- Works **offline**. Everything lives in this device's storage. Nothing leaves it.

Built with React, TypeScript, Tailwind, Vite, Zustand. PDF via jsPDF. Excel via SheetJS.

## Features

| | |
|---|---|
| Multi-area roster | One guard belongs to one area; areas can be added/edited/removed. |
| Daily attendance | Tap to mark Present, Half, Leave, or Absent. Tap again to clear. Bulk "mark all" for the day. |
| Calendar navigation | Walk back to any past date and edit it. Today is the default. |
| Uniforms | Issue a uniform item with date and cost — auto-deducted from that month's salary. |
| Salary calculator | `worked_units = present + 0.5 × half_days`. `gross = units × daily_rate`. Adjust with advances, bonuses, deductions. |
| Salary slip PDF | Per-guard monthly slip with all line items. |
| Monthly statement | One PDF / Excel with every guard's salary for the month. |
| Backup / restore | Whole-workspace Excel export, importable later or onto another device. |
| Mobile-friendly | Bottom nav on phones, sidebar on desktop. |

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle into dist/
```

## Data model

All data is stored in `localStorage` under the key `guardkeeper-v1`, in a single JSON document:

```ts
{
  version: 1,
  settings: { businessName, ownerName, currency, currencySymbol },
  areas:        Area[],
  guards:       Guard[],
  attendance:   AttendanceRecord[],   // { guardId, date: 'YYYY-MM-DD', status }
  uniforms:     UniformIssue[],       // { guardId, date, item, cost }
  adjustments:  SalaryAdjustment[],   // { guardId, month: 'YYYY-MM', type, amount }
  payments:     SalaryPayment[],      // { guardId, month, amount, paidOn }
}
```

Backups exported to `.xlsx` carry one sheet per collection so the file is human-readable in Excel itself.

## Salary math

For a guard `g` in month `M`:

```
units    = count(present in M) + 0.5 × count(half in M)
gross    = units × g.dailyRate
uniforms = Σ uniform.cost issued in M
advances = Σ adjustments where type='advance'  in M
bonuses  = Σ adjustments where type='bonus'    in M
other    = Σ adjustments where type='deduction' in M
net      = gross + bonuses − uniforms − advances − other
balance  = net − Σ payments in M
```

## Privacy

There is no backend, no analytics, no account. Data sits in your browser's localStorage on this device.
Use **Settings → Backup & restore** to keep a copy you control.
