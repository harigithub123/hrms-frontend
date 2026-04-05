import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import type { UserSummary } from '../../types/hrms'

function formatRoles(params: ValueFormatterParams<UserSummary, string[] | undefined>) {
  const list = params.value ?? []
  return list.map((r) => r.replace(/^ROLE_/, '')).join(', ')
}

export function getUserRolesColumnDefs(): ColDef<UserSummary>[] {
  return [
    { headerName: 'Username', field: 'username', flex: 1 },
    {
      headerName: 'Employee ID',
      field: 'employeeId',
      width: 140,
      maxWidth: 180,
      valueFormatter: (p) => (p.value != null ? String(p.value) : '—'),
    },
    {
      headerName: 'Roles',
      field: 'roles',
      flex: 1.5,
      sortable: false,
      filter: false,
      valueFormatter: formatRoles,
    },
  ]
}
