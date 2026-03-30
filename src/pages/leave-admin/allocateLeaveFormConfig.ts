import type { GenericFormFieldConfig } from '../../components/shared'
import type { LeaveBalanceAdjustmentKind } from '../../types/hrms'
import type { LeaveType } from '../../types/hrms'

export const ALLOCATE_LEAVE_DIALOG_TITLE = 'Allocate Leave'

export const ADJUSTMENT_KIND_OPTIONS: Array<{ value: LeaveBalanceAdjustmentKind; label: string }> = [
  { value: 'ALLOCATION', label: 'Allocation (annual grant)' },
  { value: 'CARRY_FORWARD', label: 'Carry forward' },
  { value: 'LAPSE', label: 'Lapse (unused leave expired)' },
]

export type AllocateLeaveFormValues = {
  leaveTypeId: string
  kind: string
  deltaDays: string
  comment: string
}

export const EMPTY_ALLOCATE_LEAVE_FORM: AllocateLeaveFormValues = {
  leaveTypeId: '',
  kind: 'ALLOCATION',
  deltaDays: '0',
  comment: '',
}

export function getAllocateLeaveFormFields(
  types: LeaveType[],
): Array<GenericFormFieldConfig<AllocateLeaveFormValues>> {
  return [
    {
      name: 'leaveTypeId',
      label: 'Leave type',
      required: true,
      type: 'select',
      selectOptions: types.map((t) => ({
        value: String(t.id),
        label: `${t.code} — ${t.name}`,
      })),
    },
    {
      name: 'kind',
      label: 'Kind',
      required: true,
      type: 'select',
      selectOptions: ADJUSTMENT_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
    {
      name: 'deltaDays',
      label: 'Days to add (use negative to reduce)',
      required: true,
      type: 'number',
      step: 0.5,
    },
    {
      name: 'comment',
      label: 'Comment',
      required: true,
      multiline: true,
      rows: 2,
      maxLength: 2000,
    },
  ]
}
