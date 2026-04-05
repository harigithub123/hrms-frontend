import type { GenericFormFieldConfig } from '../../components/shared'

export type AttendanceEntryFormValues = {
  employeeId: string
  workDate: string
  checkIn: string
  checkOut: string
  status: string
  notes: string
}

const STATUS_OPTIONS = (['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'REMOTE'] as const).map((s) => ({
  value: s,
  label: s,
}))

/** Dialog fields after Employee (employee select is built in the page with options). */
export const ATTENDANCE_ENTRY_FORM_CONFIG: Array<GenericFormFieldConfig<AttendanceEntryFormValues>> = [
  { name: 'workDate', label: 'Work date', type: 'date', required: true },
  { name: 'checkIn', label: 'Check in', type: 'time' },
  { name: 'checkOut', label: 'Check out', type: 'time' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    selectOptions: STATUS_OPTIONS,
  },
  { name: 'notes', label: 'Notes', multiline: true, rows: 2 },
]

export const EMPTY_ATTENDANCE_ENTRY_FORM: AttendanceEntryFormValues = {
  employeeId: '',
  workDate: '',
  checkIn: '',
  checkOut: '',
  status: 'PRESENT',
  notes: '',
}
