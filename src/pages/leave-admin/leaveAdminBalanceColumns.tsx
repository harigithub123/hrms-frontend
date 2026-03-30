import type { ColDef, ValueGetterParams } from 'ag-grid-community'
import type { LeaveBalance } from '../../types/hrms'
import { num } from './leaveAdminUtils'

function availableGetter(p: ValueGetterParams<LeaveBalance>): number {
  const b = p.data
  if (!b) return 0
  return num(b.allocatedDays) + num(b.carryForwardedDays) - num(b.usedDays)
}

export function getLeaveAdminBalanceColumnDefs(): ColDef<LeaveBalance>[] {
  return [
    {
      headerName: 'Type',
      valueGetter: (p) => {
        const b = p.data
        return b ? `${b.leaveTypeName}` : ''
      },
      flex: 1.2,
    },
    {
      headerName: 'Allocated',
      field: 'allocatedDays',
      valueFormatter: (p) => (p.value == null ? '' : String(p.value)),
    },
    {
      headerName: 'Carry forwarded',
      field: 'carryForwardedDays',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '0' : String(p.value)),
    },
    {
      headerName: 'Used',
      field: 'usedDays',
      valueFormatter: (p) => (p.value == null ? '' : String(p.value)),
    },
    {
      headerName: 'Available',
      valueGetter: availableGetter,
      valueFormatter: (p) => String(p.value ?? 0),
    },
  ]
}
