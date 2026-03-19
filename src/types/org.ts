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

export interface Employee {
  id: number
  employeeCode: string | null
  firstName: string
  lastName: string
  email: string | null
  departmentId: number | null
  departmentName: string | null
  designationId: number | null
  designationName: string | null
  managerId: number | null
  managerName: string | null
  joinedAt: string | null
}

export type DepartmentRequest = Pick<Department, 'name' | 'code' | 'description'>
export type DesignationRequest = Pick<Designation, 'name' | 'code'>
export interface EmployeeRequest {
  employeeCode?: string | null
  firstName: string
  lastName: string
  email?: string | null
  departmentId?: number | null
  designationId?: number | null
  managerId?: number | null
  joinedAt?: string | null
}
