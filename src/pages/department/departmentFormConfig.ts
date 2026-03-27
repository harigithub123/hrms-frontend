import type { GenericFormFieldConfig } from '../../components/shared'

export type DepartmentFormValues = {
  name: string
  code: string
  description: string
}

export const DEPARTMENT_FORM_CONFIG: Array<GenericFormFieldConfig<DepartmentFormValues>> = [
  { name: 'name', label: 'Name', required: true, maxLength: 150 },
  { name: 'code', label: 'Code', maxLength: 50 },
  { name: 'description', label: 'Description', maxLength: 500, multiline: true, rows: 2 },
]

export const EMPTY_DEPARTMENT_FORM: DepartmentFormValues = {
  name: '',
  code: '',
  description: '',
}
