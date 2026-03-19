export interface Holiday {
  id: number
  holidayDate: string
  name: string
}

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface LeaveType {
  id: number
  name: string
  code: string
  daysPerYear: string
  carryForward: boolean
  paid: boolean
  active: boolean
}

export interface LeaveBalance {
  id: number
  employeeId: number
  leaveTypeId: number
  leaveTypeName: string
  leaveTypeCode: string
  year: number
  allocatedDays: string
  usedDays: string
}

export interface LeaveRequest {
  id: number
  employeeId: number
  employeeName: string
  leaveTypeId: number
  leaveTypeName: string
  leaveTypeCode: string
  startDate: string
  endDate: string
  totalDays: string
  reason: string | null
  status: LeaveRequestStatus
  requestedAt: string
  decidedAt: string | null
  decidedByUserId: number | null
  decisionComment: string | null
}

/** Expanded: one row per day (optional API /leave/calendar/days) */
export interface LeaveCalendarEntry {
  date: string
  requestId: number
  employeeId: number
  employeeName: string
  leaveTypeId: number
  leaveTypeCode: string
  leaveTypeName: string
  status: LeaveRequestStatus
}

/** Default: one row per leave request with start/end dates (API /leave/calendar) */
export interface LeaveCalendarRange {
  requestId: number
  employeeId: number
  employeeName: string
  leaveTypeId: number
  leaveTypeCode: string
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: string
  status: LeaveRequestStatus
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'REMOTE'

export interface AttendanceRecord {
  id: number
  employeeId: number
  employeeName: string
  workDate: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  notes: string | null
}

export type SalaryComponentKind = 'EARNING' | 'DEDUCTION'

export interface SalaryComponent {
  id: number
  code: string
  name: string
  kind: SalaryComponentKind
  sortOrder: number
  active: boolean
}

export interface SalaryStructureLine {
  componentId: number
  componentCode: string
  componentName: string
  kind: SalaryComponentKind
  amount: string
}

export interface SalaryStructure {
  id: number
  employeeId: number
  effectiveFrom: string
  currency: string
  note: string | null
  lines: SalaryStructureLine[]
}

export type PayRunStatus = 'DRAFT' | 'FINALIZED'

export interface PayRun {
  id: number
  periodStart: string
  periodEnd: string
  status: PayRunStatus
}

export interface PayslipLine {
  componentId: number | null
  componentCode: string
  componentName: string
  kind: SalaryComponentKind
  amount: string
}

export interface Payslip {
  id: number
  payRunId: number
  employeeId: number
  employeeName: string
  grossAmount: string
  deductionAmount: string
  netAmount: string
  lines: PayslipLine[]
}

export interface UserSummary {
  id: number
  username: string
  employeeId: number | null
}
