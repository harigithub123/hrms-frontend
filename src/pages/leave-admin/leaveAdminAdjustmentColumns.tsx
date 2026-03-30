import type { ColDef } from 'ag-grid-community'
import type { LeaveBalanceAdjustment } from '../../types/hrms'

export function formatAdjustmentKind(kind: LeaveBalanceAdjustment['kind']): string {
  if (kind === 'CARRY_FORWARD') return 'Carry forward'
  if (kind === 'LAPSE') return 'Lapse'
  return 'Allocation'
}

export function getLeaveAdminAdjustmentColumnDefs(): ColDef<LeaveBalanceAdjustment>[] {
  return [
    {
      headerName: 'When',
      field: 'createdAt',
      valueFormatter: (p) => (p.value ? new Date(String(p.value)).toLocaleDateString() : ''),
      flex: 1,
    },
    {
      headerName: 'Type',
      valueGetter: (p) => {
        const a = p.data
        return a ? `${a.leaveTypeName}` : ''
      },
      flex: 1,
    },
    {
      headerName: 'Kind',
      field: 'kind',
      valueFormatter: (p) => formatAdjustmentKind(p.value as LeaveBalanceAdjustment['kind']),
    },
    {
      headerName: 'Δ days',
      field: 'deltaDays',
      valueFormatter: (p) => (p.value == null ? '' : String(p.value)),
    },
    {
      headerName: 'Comment',
      field: 'comment',
      flex: 1.2,
      tooltipField: 'comment',
    },
    {
      headerName: 'By',
      field: 'createdByUsername',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
  ]
}
