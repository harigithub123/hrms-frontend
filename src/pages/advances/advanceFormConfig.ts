import type { GenericFormFieldConfig } from '../../components/shared'

export type AdvanceRequestFormValues = {
  amount: string
  recoveryMonths: string
  reason: string
}

export const ADVANCE_REQUEST_FORM_CONFIG: Array<GenericFormFieldConfig<AdvanceRequestFormValues>> = [
  { name: 'amount', label: 'Amount', required: true, type: 'number', min: 0.01, step: 0.01 },
  { name: 'recoveryMonths', label: 'Recovery months', type: 'number', min: 1, step: 1 },
  { name: 'reason', label: 'Reason', maxLength: 500, multiline: true, rows: 2, fullRow: true },
]

export const EMPTY_ADVANCE_REQUEST_FORM: AdvanceRequestFormValues = {
  amount: '',
  recoveryMonths: '3',
  reason: '',
}
