import type { EmploymentStatus } from './org'

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
  /** Max days that may be carried from one year into the next; null = no limit. */
  maxCarryForwardPerYear: string | number | null
  /** Max total carry-forward balance; null = no limit. */
  maxCarryForward: string | number | null
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
  carryForwardedDays: string
  usedDays: string
}

export type LeaveBalanceAdjustmentKind = 'ALLOCATION' | 'CARRY_FORWARD' | 'LAPSE'

export type LeaveLedgerAction = 'OPENING' | 'ALLOCATED' | 'CARRY_FORWARD' | 'LAPSE' | 'LEAVE_TAKEN'

export interface LeaveLedgerRow {
  entryDate: string
  leaveTypeCode: string
  leaveTypeName: string
  action: LeaveLedgerAction
  days: string | number | null
  balanceAfter: string | number
  details: string
}

export interface LeaveBalanceAdjustment {
  id: number
  employeeId: number
  leaveTypeId: number
  leaveTypeCode: string
  leaveTypeName: string
  year: number
  kind: LeaveBalanceAdjustmentKind
  deltaDays: string
  comment: string
  createdAt: string
  createdByUsername: string | null
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
  /** Spring Security role names, e.g. ROLE_EMPLOYEE, ROLE_HR */
  roles: string[]
}

export interface RoleInfo {
  id: number
  name: string
}

/** Compensation package (authoring; payroll reads this for pay runs) */
export interface CompensationLine {
  id: number
  componentId: number
  componentCode: string
  componentName: string
  amount: string | number
  frequency: 'MONTHLY' | 'YEARLY' | 'ONE_TIME'
  payableOn: string | null
}

export interface EmployeeCompensation {
  id: number
  employeeId: number
  /** Present when returned from search/list APIs. */
  employeeName?: string | null
  effectiveFrom: string
  effectiveTo: string | null
  currency: string
  annualCtc: string | number | null
  annualBonus?: string | number | null
  joiningBonus?: string | number | null
  notes: string | null
  createdAt: string
  lines: CompensationLine[]
}

export type JobOfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'DECLINED' | 'JOINED' | 'EXPIRED'

export interface JobOffer {
  id: number
  candidateName: string
  candidateEmail: string | null
  candidateMobile: string | null
  status: JobOfferStatus
  employeeType: string | null
  departmentId: number | null
  departmentName: string | null
  designationId: number | null
  designationName: string | null
  managerId: number | null
  managerName: string | null
  joiningDate: string | null
  actualJoiningDate?: string | null
  offerReleaseDate: string | null
  probationPeriodMonths: number | null
  annualCtc: string | number | null
  currency: string
  bodyHtml: string | null
  pdfGeneratedAt: string | null
  employeeId: number | null
  createdAt: string
}

export type OnboardingStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type OnboardingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED'

export interface OnboardingTaskAudit {
  id: number
  action: string
  detail: string | null
  createdAt: string
  createdByUsername: string | null
}

export interface OnboardingTask {
  id: number
  name: string
  status: OnboardingTaskStatus
  done: boolean
  comment: string | null
  sortOrder: number
  auditHistory: OnboardingTaskAudit[]
}

export type OnboardingBankAccountType = 'SAVINGS' | 'CURRENT'

export interface OnboardingBankDetails {
  id: number
  caseId: number | null
  accountHolderName: string
  bankName: string
  branch: string | null
  accountNumber: string
  ifscCode: string
  accountType: OnboardingBankAccountType
  notes: string | null
  effectiveFrom: string | null
  createdAt: string
  updatedAt: string
}

/** linked = onboarding case exists; payroll bank may still exist without it (employee payroll bank table). */
export interface EmployeePayrollBankContext {
  linked: boolean
  onboardingCaseId: number | null
  bankDetails: OnboardingBankDetails | null
}

export interface PayrollBankAudit {
  id: number
  action: string
  detail: string | null
  createdByUserId: number | null
  createdByUsername: string | null
  createdAt: string
  /** Effective-from date parsed server-side from the post-change snapshot (yyyy-MM-dd). */
  effectiveFrom?: string | null
}

/** HR grid row: employee plus current payroll bank display (employee_payroll_bank or onboarding fallback). */
export interface EmployeePayrollBankSummary {
  employeeId: number
  firstName: string
  lastName: string
  employeeCode: string | null
  departmentName: string | null
  bankDetails: OnboardingBankDetails | null
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
  employeeEmploymentStatus: EmploymentStatus | null
  offerId: number | null
  assignedHrUserId: number | null
  notes: string | null
  createdAt: string
  tasks: OnboardingTask[]
  bankDetails: OnboardingBankDetails | null
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
