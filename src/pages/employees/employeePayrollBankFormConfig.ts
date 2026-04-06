import type { GenericFormFieldConfig } from '../../components/shared'

export type PayrollBankFormValues = {
  accountHolderName: string
  bankName: string
  branch: string
  accountNumber: string
  ifscCode: string
  accountType: string
  notes: string
  effectiveFrom: string
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** New bank row: required fields empty; effective date defaults to today (local via ISO). */
export function createEmptyPayrollBankForm(): PayrollBankFormValues {
  return {
    accountHolderName: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'SAVINGS',
    notes: '',
    effectiveFrom: todayIsoDate(),
  }
}

export const PAYROLL_BANK_FORM_CONFIG: Array<GenericFormFieldConfig<PayrollBankFormValues>> = [
  { name: 'accountHolderName', label: 'Account holder name', required: true, maxLength: 200 },
  { name: 'bankName', label: 'Bank name', required: true, maxLength: 200 },
  { name: 'branch', label: 'Branch', maxLength: 200 },
  { name: 'effectiveFrom', label: 'Effective from (payroll)', type: 'date', required: true },
  { name: 'accountNumber', label: 'Account number', required: true, maxLength: 80 },
  { name: 'ifscCode', label: 'IFSC', required: true, maxLength: 20 },
  {
    name: 'accountType',
    label: 'Account type',
    type: 'select',
    required: true,
    selectOptions: [
      { value: 'SAVINGS', label: 'Savings' },
      { value: 'CURRENT', label: 'Current' },
    ],
  },
  { name: 'notes', label: 'Notes', maxLength: 500, multiline: true, rows: 2, fullRow: true },
]
