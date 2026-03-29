import type { ColDef } from 'ag-grid-community'
import type { LeaveType } from '../../types/hrms'

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No'
}

export function getLeaveTypeColumnDefs(): ColDef<LeaveType>[] {
  return [
    { headerName: 'Name', field: 'name' },
    { headerName: 'Code', field: 'code' },
    {
      headerName: 'Days / year',
      field: 'daysPerYear',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Carry forward',
      field: 'carryForward',
      valueFormatter: (p) => yesNo(Boolean(p.value)),
    },
    {
      headerName: 'Max carry / yr',
      field: 'maxCarryForwardPerYear',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Max carry cap',
      field: 'maxCarryForward',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Paid',
      field: 'paid',
      valueFormatter: (p) => yesNo(Boolean(p.value)),
    },
    {
      headerName: 'Active',
      field: 'active',
      valueFormatter: (p) => yesNo(Boolean(p.value)),
    },
  ]
}
