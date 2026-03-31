import type { GenericFormFieldConfig } from '../../components/shared/CommonInputForm'

export type OfferFormValues = {
  templateId: string
  employeeType: string
  candidateName: string
  candidateEmail: string
  candidateMobile: string
  departmentId: string
  designationId: string
  managerId: string
  joinDate: string
  offerReleaseDate: string
  probationPeriodMonths: string
  joiningBonus: string
  yearlyBonus: string
  annualCtc: string
  currency: string
}

export const EMPTY_OFFER_FORM: OfferFormValues = {
  templateId: '',
  employeeType: 'PERMANENT_FULL_TIME',
  candidateName: '',
  candidateEmail: '',
  candidateMobile: '',
  departmentId: '',
  designationId: '',
  managerId: '',
  joinDate: '',
  offerReleaseDate: '',
  probationPeriodMonths: '',
  joiningBonus: '',
  yearlyBonus: '',
  annualCtc: '',
  currency: 'INR',
}

export const OFFER_TEXT_RULES: Array<{ name: keyof OfferFormValues; label: string; required?: boolean; maxLength?: number }> = [
  { name: 'candidateName', label: 'Employee name', required: true, maxLength: 200 },
  { name: 'candidateEmail', label: 'Personal email', required: true, maxLength: 255 },
  { name: 'candidateMobile', label: 'Mobile number', required: true, maxLength: 30 },
]

export function getOfferFormFields(opts: {
  templateOptions: Array<{ value: string; label: string }>
  departmentOptions: Array<{ value: string; label: string }>
  designationOptions: Array<{ value: string; label: string }>
  managerOptions: Array<{ value: string; label: string }>
}): Array<GenericFormFieldConfig<OfferFormValues>> {
  return [
    { name: 'templateId', label: 'Template', type: 'select', selectOptions: opts.templateOptions },
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
    { name: 'managerId', label: 'Manager', type: 'select', selectOptions: opts.managerOptions },
    { name: 'joinDate', label: 'Joining date', type: 'date' },
    { name: 'offerReleaseDate', label: 'Offer release date', type: 'date' },
    { name: 'probationPeriodMonths', label: 'Probation period (months)', type: 'number', min: 0, max: 48, step: 1 },
    { name: 'joiningBonus', label: 'Joining bonus', type: 'number', min: 0, step: 1 },
    { name: 'yearlyBonus', label: 'Yearly bonus', type: 'number', min: 0, step: 1 },
    { name: 'annualCtc', label: 'Annual CTC', type: 'number', min: 0, step: 1 },
    { name: 'currency', label: 'Currency', maxLength: 10 },
  ]
}

