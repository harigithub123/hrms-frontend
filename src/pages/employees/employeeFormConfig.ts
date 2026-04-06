import type { GenericFormFieldConfig } from '../../components/shared'
import { EMPLOYMENT_STATUS_OPTIONS, type EmploymentStatus } from '../../types/org'

export type EmployeeFormValues = {
  firstName: string
  lastName: string
  email: string
  employeeCode: string
  departmentId: string
  designationId: string
  managerId: string
  joinedAt: string
  employmentStatus: EmploymentStatus
  lastWorkingDate: string
  exitReason: string
}

/** Validation rules for text fields only (selects are optional). */
export const EMPLOYEE_TEXT_RULES: Array<{
  name: keyof EmployeeFormValues
  label: string
  required?: boolean
  maxLength?: number
}> = [
  { name: 'firstName', label: 'First name', required: true, maxLength: 100 },
  { name: 'lastName', label: 'Last name', required: true, maxLength: 100 },
  { name: 'email', label: 'Email', maxLength: 255 },
  { name: 'employeeCode', label: 'Employee code', maxLength: 50 },
  { name: 'exitReason', label: 'Exit reason', maxLength: 1000 },
]

export const EMPTY_EMPLOYEE_FORM: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  employeeCode: '',
  departmentId: '',
  designationId: '',
  managerId: '',
  joinedAt: '',
  employmentStatus: 'JOINED',
  lastWorkingDate: '',
  exitReason: '',
}

export function getEmployeeFormFields(opts: {
  departmentOptions: Array<{ value: string; label: string }>
  designationOptions: Array<{ value: string; label: string }>
  managerOptions: Array<{ value: string; label: string }>
}): Array<GenericFormFieldConfig<EmployeeFormValues>> {
  return [
    { name: 'firstName', label: 'First name', required: true, maxLength: 100 },
    { name: 'lastName', label: 'Last name', required: true, maxLength: 100 },
    { name: 'email', label: 'Email', type: 'email', maxLength: 255 },
    { name: 'employeeCode', label: 'Employee code', maxLength: 50 },
    {
      name: 'departmentId',
      label: 'Department',
      type: 'select',
      selectOptions: opts.departmentOptions,
    },
    {
      name: 'designationId',
      label: 'Designation',
      type: 'select',
      selectOptions: opts.designationOptions,
    },
    {
      name: 'managerId',
      label: 'Manager',
      type: 'select',
      selectOptions: opts.managerOptions,
    },
    { name: 'joinedAt', label: 'Joined date', type: 'date' },
    {
      name: 'employmentStatus',
      label: 'Employment status',
      type: 'select',
      selectOptions: EMPLOYMENT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      fullRow: true,
    },
    { name: 'lastWorkingDate', label: 'Last working date', type: 'date', fullRow: true },
    {
      name: 'exitReason',
      label: 'Reason (exit / separation)',
      multiline: true,
      rows: 3,
      maxLength: 1000,
      fullRow: true,
    },
  ]
}
