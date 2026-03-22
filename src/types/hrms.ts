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

/** Compensation package (authoring; sync to salary structure from UI) */
export interface CompensationLine {
  id: number
  componentId: number
  componentCode: string
  componentName: string
  amount: string | number
}

export interface EmployeeCompensation {
  id: number
  employeeId: number
  effectiveFrom: string
  effectiveTo: string | null
  currency: string
  annualCtc: string | number | null
  notes: string | null
  createdAt: string
  lines: CompensationLine[]
}

export interface OfferTemplate {
  id: number
  name: string
  bodyHtml: string
  active: boolean
  createdAt: string
}

export type JobOfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'

export interface JobOffer {
  id: number
  templateId: number | null
  candidateName: string
  candidateEmail: string | null
  status: JobOfferStatus
  departmentId: number | null
  departmentName: string | null
  designationId: number | null
  designationName: string | null
  managerId: number | null
  managerName: string | null
  joinDate: string | null
  annualCtc: string | number | null
  currency: string
  bodyHtml: string | null
  pdfGeneratedAt: string | null
  createdAt: string
}

export type OnboardingStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface OnboardingTask {
  id: number
  label: string
  done: boolean
  sortOrder: number
}

export interface OnboardingCase {
  id: number
  status: OnboardingStatus
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string | null
  joinDate: string
  departmentId: number | null
  departmentName: string | null
  designationId: number | null
  designationName: string | null
  managerId: number | null
  managerName: string | null
  employeeId: number | null
  offerId: number | null
  assignedHrUserId: number | null
  notes: string | null
  createdAt: string
  tasks: OnboardingTask[]
}

export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'RECOVERY_COMPLETE'

export interface SalaryAdvance {
  id: number
  employeeId: number
  employeeName: string
  amount: string | number
  currency: string
  reason: string | null
  status: AdvanceStatus
  requestedAt: string
  approvedByUserId: number | null
  approvedAt: string | null
  rejectedReason: string | null
  payoutDate: string | null
  paidAt: string | null
  recoveryMonths: number
  recoveryAmountPerMonth: string | number | null
  outstandingBalance: string | number | null
}
