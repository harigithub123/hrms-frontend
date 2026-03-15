import type { AuthResponse } from '../types/auth'
import type { Department, Designation, Employee, DepartmentRequest, DesignationRequest, EmployeeRequest } from '../types/org'

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

export const departmentsApi = {
  list: () => apiFetch<Department[]>('/departments').then(handleOk),
  get: (id: number) => apiFetch<Department>(`/departments/${id}`).then(handleOk),
  create: (body: DepartmentRequest) => apiFetch<Department>('/departments', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (id: number, body: DepartmentRequest) => apiFetch<Department>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/departments/${id}`, { method: 'DELETE' }).then(handleOk),
}

export const designationsApi = {
  list: () => apiFetch<Designation[]>('/designations').then(handleOk),
  get: (id: number) => apiFetch<Designation>(`/designations/${id}`).then(handleOk),
  create: (body: DesignationRequest) => apiFetch<Designation>('/designations', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (id: number, body: DesignationRequest) => apiFetch<Designation>(`/designations/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/designations/${id}`, { method: 'DELETE' }).then(handleOk),
}

export const employeesApi = {
  list: () => apiFetch<Employee[]>('/employees').then(handleOk),
  get: (id: number) => apiFetch<Employee>(`/employees/${id}`).then(handleOk),
  create: (body: EmployeeRequest) => apiFetch<Employee>('/employees', { method: 'POST', body: JSON.stringify(body) }).then(handleOk),
  update: (id: number, body: EmployeeRequest) => apiFetch<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(handleOk),
  delete: (id: number) => apiFetch<void>(`/employees/${id}`, { method: 'DELETE' }).then(handleOk),
}
