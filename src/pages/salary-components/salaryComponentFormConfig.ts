import type { GenericFormFieldConfig } from '../../components/shared'

const YES_NO = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

const KIND_OPTIONS = [
  { value: 'EARNING', label: 'Earning (e.g. Basic, HRA, allowance)' },
  { value: 'DEDUCTION', label: 'Deduction' },
]

export type SalaryComponentFormValues = {
  name: string
  kind: string
  sortOrder: string
  active: string
}

export const SALARY_COMPONENT_FORM_CONFIG: Array<GenericFormFieldConfig<SalaryComponentFormValues>> = [
  { name: 'name', label: 'Name', required: true, maxLength: 150 },
  { name: 'kind', label: 'Kind', required: true, type: 'select', selectOptions: KIND_OPTIONS },
  {
    name: 'sortOrder',
    label: 'Sort order',
    required: true,
    type: 'number',
    min: 0,
    step: 1,
  },
  { name: 'active', label: 'Active', required: true, type: 'select', selectOptions: YES_NO },
]

export const EMPTY_SALARY_COMPONENT_FORM: SalaryComponentFormValues = {
  name: '',
  kind: 'EARNING',
  sortOrder: '0',
  active: 'true',
}
