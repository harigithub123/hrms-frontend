import type { GenericFormFieldConfig } from '../../components/shared/CommonInputForm'

export type OfferFormValues = {
  employeeType: string
  candidateName: string
  candidateEmail: string
  candidateMobile: string
  departmentId: string
  designationId: string
  joinDate: string
  offerReleaseDate: string
  probationPeriodMonths: string
  annualCtc: string
}

export type OfferLineFrequency = 'MONTHLY' | 'YEARLY' | 'ONE_TIME'

export const OFFER_LINE_FREQUENCY_OPTIONS: Array<{ value: OfferLineFrequency; label: string }> = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'ONE_TIME', label: 'One-time' },
]

export const EMPTY_OFFER_FORM: OfferFormValues = {
  employeeType: 'PERMANENT_FULL_TIME',
  candidateName: '',
  candidateEmail: '',
  candidateMobile: '',
  departmentId: '',
  designationId: '',
  joinDate: '',
  offerReleaseDate: '',
  probationPeriodMonths: '',
  annualCtc: '',
}

export const OFFER_TEXT_RULES: Array<{ name: keyof OfferFormValues; label: string; required?: boolean; maxLength?: number }> = [
  { name: 'candidateName', label: 'Employee name', required: true, maxLength: 200 },
  { name: 'candidateEmail', label: 'Personal email', required: true, maxLength: 255 },
  { name: 'candidateMobile', label: 'Mobile number', required: true, maxLength: 30 },
]

export function getOfferFormFields(opts: {
  departmentOptions: Array<{ value: string; label: string }>
  designationOptions: Array<{ value: string; label: string }>
  managerOptions: Array<{ value: string; label: string }>
}): Array<GenericFormFieldConfig<OfferFormValues>> {
  return [
    {
      name: 'employeeType',
      label: 'Employee type',
      type: 'select',
      required: true,
      selectOptions: [
        { value: 'PERMANENT_FULL_TIME', label: 'Permanent - Full time' },
        { value: 'PERMANENT_PART_TIME', label: 'Permanent - Part time' },
        { value: 'CONTRACT', label: 'Contract' },
      ],
    },
    { name: 'candidateName', label: 'Employee name', required: true, maxLength: 200 },
    { name: 'candidateEmail', label: 'Personal email', type: 'email', required: true, maxLength: 255 },
    { name: 'candidateMobile', label: 'Mobile number', required: true, maxLength: 30 },
    { name: 'departmentId', label: 'Department', type: 'select', selectOptions: opts.departmentOptions },
    { name: 'designationId', label: 'Designation', type: 'select', selectOptions: opts.designationOptions },
    { name: 'joinDate', label: 'Joining date', type: 'date' },
    { name: 'offerReleaseDate', label: 'Offer release date', type: 'date' },
    { name: 'probationPeriodMonths', label: 'Probation period (months)', type: 'number', min: 0, max: 48, step: 1 },
  ]
}

