import type { GenericFormFieldConfig } from '../../components/shared'

const YES_NO = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

export type LeaveTypeFormValues = {
  name: string
  code: string
  daysPerYear: string
  carryForward: string
  paid: string
  active: string
}

export const LEAVE_TYPE_FORM_CONFIG: Array<GenericFormFieldConfig<LeaveTypeFormValues>> = [
  { name: 'name', label: 'Name', required: true, maxLength: 150 },
  { name: 'code', label: 'Code', required: true, maxLength: 50 },
  {
    name: 'daysPerYear',
    label: 'Days per year',
    required: true,
    type: 'number',
    min: 0,
    step: 0.5,
  },
  { name: 'carryForward', label: 'Carry forward', required: true, type: 'select', selectOptions: YES_NO },
  { name: 'paid', label: 'Paid', required: true, type: 'select', selectOptions: YES_NO },
  { name: 'active', label: 'Active', required: true, type: 'select', selectOptions: YES_NO },
]

export const EMPTY_LEAVE_TYPE_FORM: LeaveTypeFormValues = {
  name: '',
  code: '',
  daysPerYear: '',
  carryForward: 'false',
  paid: 'true',
  active: 'true',
}
