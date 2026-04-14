import type { ColDef } from 'ag-grid-community'
import type { SalaryComponentAdmin, SalaryComponentKind } from '../../types/hrms'

function kindLabel(k: SalaryComponentKind): string {
  return k === 'EARNING' ? 'Earning' : 'Deduction'
}

export function getSalaryComponentColumnDefs(): ColDef<SalaryComponentAdmin>[] {
  return [
    { headerName: 'Name', field: 'name' },
    {
      headerName: 'Kind',
      field: 'kind',
      valueFormatter: (p) => (p.value ? kindLabel(p.value as SalaryComponentKind) : '—'),
    },
    { headerName: 'Sort', field: 'sortOrder', width: 100 },
    {
      headerName: 'Active',
      field: 'active',
      valueFormatter: (p) => (p.value ? 'Yes' : 'No'),
    },
  ]
}
