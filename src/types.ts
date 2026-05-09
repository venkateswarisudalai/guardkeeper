export type AttendanceStatus = 'present' | 'absent' | 'half' | 'leave';

export interface Area {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
}

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun

export interface Guard {
  id: string;
  name: string;
  phone?: string;
  areaId: string;
  dailyRate: number;
  joinDate: string;
  active: boolean;
  notes?: string;
  weeklyOff?: WeekDay[];
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  paid: boolean;
}

export interface AttendanceRecord {
  id: string;
  guardId: string;
  date: string;
  status: AttendanceStatus;
}

export interface UniformIssue {
  id: string;
  guardId: string;
  date: string;
  item: string;
  cost: number;
  note?: string;
}

export type AdjustmentType = 'advance' | 'bonus' | 'deduction';

export interface SalaryAdjustment {
  id: string;
  guardId: string;
  month: string;
  type: AdjustmentType;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  guardId: string;
  month: string;
  amount: number;
  paidOn: string;
  note?: string;
}

export interface Settings {
  ownerName: string;
  businessName: string;
  currency: string;
  currencySymbol: string;
  payOnHolidays: boolean;
  lastBackupAt?: string;
}

export interface AppData {
  version: number;
  settings: Settings;
  areas: Area[];
  guards: Guard[];
  attendance: AttendanceRecord[];
  uniforms: UniformIssue[];
  adjustments: SalaryAdjustment[];
  payments: SalaryPayment[];
  holidays: Holiday[];
}

export interface SalaryComputation {
  guardId: string;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  holidayPaidDays: number;
  workedUnits: number;
  dailyRate: number;
  gross: number;
  uniformDeduction: number;
  advances: number;
  bonuses: number;
  otherDeductions: number;
  net: number;
  paid: number;
  balance: number;
  outstandingAdvance: number; // running balance carried from prior months
}
