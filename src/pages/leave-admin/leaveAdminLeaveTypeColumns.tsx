import type { ColDef } from 'ag-grid-community'
import type { LeaveType } from '../../types/hrms'

function yesNo(v: boolean): string {
  return v ? 'Yes' : 'No'
}

export function getLeaveAdminLeaveTypeColumnDefs(): ColDef<LeaveType>[] {
  return [
    { headerName: 'Code', field: 'code' },
    { headerName: 'Name', field: 'name' },
    {
      headerName: 'Days/year',
      field: 'daysPerYear',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Carry FWD',
      field: 'carryForward',
      valueFormatter: (p) => yesNo(Boolean(p.value)),
    },
    {
      headerName: 'Max / yr',
      valueGetter: (p) => {
        const t = p.data
        if (!t?.carryForward) return null
        const v = t.maxCarryForwardPerYear
        return v != null && v !== '' ? v : null
      },
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Max cap',
      valueGetter: (p) => {
        const t = p.data
        if (!t?.carryForward) return null
        const v = t.maxCarryForward
        return v != null && v !== '' ? v : null
      },
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Active',
      field: 'active',
      valueFormatter: (p) => yesNo(Boolean(p.value)),
    },
  ]
}
