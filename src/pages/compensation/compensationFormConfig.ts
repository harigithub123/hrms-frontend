import type { GenericFormFieldConfig } from '../../components/shared'

export type CompensationFormValues = {
  employeeId: string
  effectiveFrom: string
}

export const EMPTY_COMPENSATION_FORM: CompensationFormValues = {
  employeeId: '',
  effectiveFrom: '',
}

export const COMPENSATION_FORM_RULES: Array<{
  name: keyof CompensationFormValues
  label: string
  required?: boolean
}> = [
  { name: 'employeeId', label: 'Employee', required: true },
  { name: 'effectiveFrom', label: 'Effective from', required: true },
]

export function getCompensationFormFields(opts: {
  employeeOptions: Array<{ value: string; label: string }>
}): Array<GenericFormFieldConfig<CompensationFormValues>> {
  return [
    {
      name: 'employeeId',
      label: 'Employee',
      type: 'select',
      required: true,
      selectOptions: opts.employeeOptions,
      fullRow: true,
    },
    { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true },
  ]
}
