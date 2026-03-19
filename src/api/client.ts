import type { AuthResponse } from '../types/auth'
import type {
  Department,
  Designation,
  Employee,
  DepartmentRequest,
  DesignationRequest,
  EmployeeRequest,
  PagedResponse,
} from '../types/org'
import type {
  AttendanceRecord,
  AttendanceStatus,
  Holiday,
  LeaveBalance,
  LeaveCalendarEntry,
  LeaveCalendarRange,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
  PayRun,
  Payslip,
  SalaryComponent,
  SalaryComponentKind,
  SalaryStructure,
  UserSummary,
} from '../types/hrms'

const API_BASE = '/api'

let accessToken: string | null = null
let onTokenUpdate: ((token: string | null) => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  onTokenUpdate?.(token)
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setOnTokenUpdate(callback: (token: string | null) => void) {
  onTokenUpdate = callback
}

export async function refreshAuth(): Promise<AuthResponse | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) return null
  const data: AuthResponse = await res.json()
  setAccessToken(data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  return data
}

async function refreshAccessToken(): Promise<string | null> {
  const data = await refreshAuth()
  return data?.accessToken ?? null
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; ok: true } | { error: Response; ok: false }> {
  const doFetch = (token: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    return fetch(`${API_BASE}${path}`, { ...options, headers })
  }

  let res = await doFetch(accessToken)
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await doFetch(newToken)
    } else {
      setAccessToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:session-expired'))
      }
    }
  }
  if (!res.ok) return { ok: false, error: res }
  const data = (await res.json().catch(() => ({}))) as T
  return { ok: true, data }
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Login failed')
  }
  return res.json()
}

export async function getMe(): Promise<AuthResponse['user']> {
  const result = await apiFetch<AuthResponse['user']>('/auth/me')
  if (!result.ok) throw new Error(result.error.status === 401 ? 'Unauthorized' : 'Request failed')
  return result.data
}

export async function getUsersMe(): Promise<AuthResponse['user']> {
  const result = await apiFetch<AuthResponse['user']>('/users/me')
  if (!result.ok) throw new Error(result.error.status === 401 ? 'Unauthorized' : 'Request failed')
  return result.data
}

async function handleOk<T>(result: { ok: true; data: T } | { ok: false; error: Response }): Promise<T> {
  if (!result.ok) {
    const err = await result.error.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Request failed')
  }
  return result.data
}

async function fetchBinary(path: string): Promise<Blob> {
  const doFetch = (token: string | null) => {
    const headers: HeadersInit = {}
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    return fetch(`${API_BASE}${path}`, { headers })
  }
  let res = await doFetch(accessToken)
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await doFetch(newToken)
    } else {
      setAccessToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:session-expired'))
      }
      throw new Error('Unauthorized')
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Request failed')
  }
  return res.blob()
}

function buildPageParams(page: number, size: number) {
  return `?page=${page}&size=${size}`
}

export const departmentsApi = {
  list: (page = 0, size = 10) =>
    apiFetch<PagedResponse<Department>>(`/departments${buildPageParams(page, size)}`).then(handleOk),
  listAll: () => apiFetch<Department[]>('/departments/all').then(handleOk),
  get: (id: number) => apiFetch<Department>(`/departments/${id}`).then(handleOk),
  create: (body: DepartmentRequest) => apiFetch<Department>('/departments', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (id: number, body: DepartmentRequest) => apiFetch<Department>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/departments/${id}`, { method: 'DELETE' }).then(handleOk),
}

export const designationsApi = {
  list: (page = 0, size = 10) =>
    apiFetch<PagedResponse<Designation>>(`/designations${buildPageParams(page, size)}`).then(handleOk),
  listAll: () => apiFetch<Designation[]>('/designations/all').then(handleOk),
  get: (id: number) => apiFetch<Designation>(`/designations/${id}`).then(handleOk),
  create: (body: DesignationRequest) => apiFetch<Designation>('/designations', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (id: number, body: DesignationRequest) => apiFetch<Designation>(`/designations/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/designations/${id}`, { method: 'DELETE' }).then(handleOk),
}

/** Current user's context (any authenticated user with a linked employee). */
export const meApi = {
  /** Employees who report to the logged-in user (manager → direct reports). */
  directReports: () => apiFetch<Employee[]>('/me/direct-reports').then(handleOk),
}

export const employeesApi = {
  list: (page = 0, size = 10) =>
    apiFetch<PagedResponse<Employee>>(`/employees${buildPageParams(page, size)}`).then(handleOk),
  listAll: () => apiFetch<Employee[]>('/employees/all').then(handleOk),
  get: (id: number) => apiFetch<Employee>(`/employees/${id}`).then(handleOk),
  create: (body: EmployeeRequest) => apiFetch<Employee>('/employees', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (id: number, body: EmployeeRequest) => apiFetch<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/employees/${id}`, { method: 'DELETE' }).then(handleOk),
}

export const usersApi = {
  list: () => apiFetch<UserSummary[]>('/users').then(handleOk),
  linkEmployee: (userId: number, employeeId: number | null) =>
    apiFetch<void>(`/users/${userId}/employee`, {
      method: 'PUT',
      body: JSON.stringify({ employeeId }),
    }).then(handleOk),
}

export const holidaysApi = {
  list: (year: number) => apiFetch<Holiday[]>(`/holidays?year=${year}`).then(handleOk),
}

export const leaveTypesApi = {
  listActive: () => apiFetch<LeaveType[]>('/leave/types/active').then(handleOk),
  listAll: () => apiFetch<LeaveType[]>('/leave/types').then(handleOk),
  create: (body: {
    name: string
    code: string
    daysPerYear: number
    carryForward: boolean
    paid: boolean
    active: boolean
  }) => apiFetch<LeaveType>('/leave/types', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (
    id: number,
    body: {
      name: string
      code: string
      daysPerYear: number
      carryForward: boolean
      paid: boolean
      active: boolean
    }
  ) => apiFetch<LeaveType>(`/leave/types/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/leave/types/${id}`, { method: 'DELETE' }).then(handleOk),
}

export const leaveBalancesApi = {
  list: (employeeId: number, year: number) =>
    apiFetch<LeaveBalance[]>(`/leave/balances?employeeId=${employeeId}&year=${year}`).then(handleOk),
  upsert: (body: { employeeId: number; leaveTypeId: number; year: number; allocatedDays: number }) =>
    apiFetch<LeaveBalance>('/leave/balances', { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
}

export const leaveRequestsApi = {
  list: (params?: { employeeId?: number; status?: LeaveRequestStatus }) => {
    const q = new URLSearchParams()
    if (params?.employeeId != null) q.set('employeeId', String(params.employeeId))
    if (params?.status) q.set('status', params.status)
    const qs = q.toString()
    return apiFetch<LeaveRequest[]>(`/leave/requests${qs ? `?${qs}` : ''}`).then(handleOk)
  },
  listPending: () => apiFetch<LeaveRequest[]>('/leave/requests/pending').then(handleOk),
  create: (body: { employeeId?: number | null; leaveTypeId: number; startDate: string; endDate: string; reason?: string | null }) =>
    apiFetch<LeaveRequest>('/leave/requests', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  decide: (id: number, body: { approve: boolean; comment?: string | null }) =>
    apiFetch<LeaveRequest>(`/leave/requests/${id}/decision`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  /** One row per leave request (date range) — default for month view */
  calendar: (from: string, to: string, employeeId?: number | null) => {
    const q = new URLSearchParams({ from, to })
    if (employeeId != null) q.set('employeeId', String(employeeId))
    return apiFetch<LeaveCalendarRange[]>(`/leave/calendar?${q.toString()}`).then(handleOk)
  },
  /** One row per day (expanded) */
  calendarDays: (from: string, to: string, employeeId?: number | null) => {
    const q = new URLSearchParams({ from, to })
    if (employeeId != null) q.set('employeeId', String(employeeId))
    return apiFetch<LeaveCalendarEntry[]>(`/leave/calendar/days?${q.toString()}`).then(handleOk)
  },
}

export const attendanceApi = {
  list: (employeeId: number, from: string, to: string) =>
    apiFetch<AttendanceRecord[]>(`/attendance?employeeId=${employeeId}&from=${from}&to=${to}`).then(handleOk),
  upsert: (body: {
    employeeId: number
    workDate: string
    checkIn: string | null
    checkOut: string | null
    status: AttendanceStatus
    notes?: string | null
  }) => apiFetch<AttendanceRecord>('/attendance', { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
}

export const payrollApi = {
  components: () => apiFetch<SalaryComponent[]>('/payroll/components').then(handleOk),
  componentsAll: () => apiFetch<SalaryComponent[]>('/payroll/components/all').then(handleOk),
  createComponent: (body: {
    code: string
    name: string
    kind: SalaryComponentKind
    sortOrder: number
    active: boolean
  }) =>
    apiFetch<SalaryComponent>('/payroll/components', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  updateComponent: (
    id: number,
    body: { code: string; name: string; kind: SalaryComponentKind; sortOrder: number; active: boolean }
  ) => apiFetch<SalaryComponent>(`/payroll/components/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  saveStructure: (body: {
    employeeId: number
    effectiveFrom: string
    currency?: string | null
    note?: string | null
    lines: { componentId: number; amount: number }[]
  }) =>
    apiFetch<SalaryStructure>('/payroll/structures', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  latestStructure: (employeeId: number, asOf?: string | null) => {
    const q = asOf ? `?asOf=${encodeURIComponent(asOf)}` : ''
    return apiFetch<SalaryStructure>(`/payroll/structures/employee/${employeeId}${q}`).then(handleOk)
  },
  payRuns: () => apiFetch<PayRun[]>('/payroll/runs').then(handleOk),
  createPayRun: (body: { periodStart: string; periodEnd: string }) =>
    apiFetch<PayRun>('/payroll/runs', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  payslipsForRun: (runId: number) =>
    apiFetch<Payslip[]>(`/payroll/runs/${runId}/payslips`).then(handleOk),
  myPayslips: (payRunId?: number | null) => {
    const q = payRunId != null ? `?payRunId=${payRunId}` : ''
    return apiFetch<Payslip[]>(`/payroll/payslips/mine${q}`).then(handleOk)
  },
  getPayslip: (id: number) => apiFetch<Payslip>(`/payroll/payslips/${id}`).then(handleOk),
  downloadPayslipPdf: (id: number) => fetchBinary(`/payroll/payslips/${id}/pdf`),
}
