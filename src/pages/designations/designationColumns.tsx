import type { ColDef } from 'ag-grid-community'
import type { Designation } from '../../types/org'

export function getDesignationColumnDefs(): ColDef<Designation>[] {
  return [
    {
      headerName: 'Code',
      field: 'code',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    { headerName: 'Name', field: 'name' },
  ]
}
