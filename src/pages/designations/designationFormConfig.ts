import type { GenericFormFieldConfig } from '../../components/shared'

export type DesignationFormValues = {
  name: string
  code: string
}

export const DESIGNATION_FORM_CONFIG: Array<GenericFormFieldConfig<DesignationFormValues>> = [
  { name: 'name', label: 'Name', required: true, maxLength: 150 },
  { name: 'code', label: 'Code', maxLength: 50 },
]

export const EMPTY_DESIGNATION_FORM: DesignationFormValues = {
  name: '',
  code: '',
}
