export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

export interface Department {
  id: number
  name: string
  code: string | null
  description: string | null
}

export interface Designation {
  id: number
  name: string
  code: string | null
}

export type EmploymentStatus =
  | 'JOINED'
  | 'TERMINATED'
  | 'RETIRED'
  | 'ABSCONDED'
  | 'EXITED'
  | 'FULL_AND_FINAL_PENDING'
  | 'RESIGNED'

export const EMPLOYMENT_STATUS_OPTIONS: Array<{ value: EmploymentStatus; label: string }> = [
  { value: 'JOINED', label: 'Joined' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'ABSCONDED', label: 'Absconded' },
  { value: 'EXITED', label: 'Exited' },
  { value: 'FULL_AND_FINAL_PENDING', label: 'Full & final pending' },
  { value: 'RESIGNED', label: 'Resigned' },
]

const employmentStatusLabelMap = Object.fromEntries(
  EMPLOYMENT_STATUS_OPTIONS.map((o) => [o.value, o.label]),
) as Record<EmploymentStatus, string>

export function formatEmploymentStatus(status: EmploymentStatus | null | undefined): string {
  if (status == null) return '—'
  return employmentStatusLabelMap[status] ?? status
}

export interface Employee {
  id: number
  employeeCode: string | null
  firstName: string
  lastName: string
  email: string | null
  mobileNumber?: string | null
  departmentId: number | null
  departmentName: string | null
  designationId: number | null
  designationName: string | null
  managerId: number | null
  managerName: string | null
  joinedAt: string | null
  employmentStatus: EmploymentStatus
  lastWorkingDate: string | null
  exitReason: string | null
}

export type DepartmentRequest = Pick<Department, 'name' | 'code' | 'description'>
export type DesignationRequest = Pick<Designation, 'name' | 'code'>
export interface EmployeeRequest {
  employeeCode?: string | null
  firstName: string
  lastName: string
  email?: string | null
  mobileNumber?: string | null
  departmentId?: number | null
  designationId?: number | null
  managerId?: number | null
  joinedAt?: string | null
  employmentStatus?: EmploymentStatus | null
  lastWorkingDate?: string | null
  exitReason?: string | null
}
