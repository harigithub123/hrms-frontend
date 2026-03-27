import type { ColDef } from 'ag-grid-community'
import type { Department } from '../../types/org'

export function getDepartmentColumnDefs(): ColDef<Department>[] {
  return [
    { headerName: 'Name', field: 'name' },
    {
      headerName: 'Code',
      field: 'code',
    },
    {
      headerName: 'Description',
      field: 'description',
      flex: 1.5,
    },
  ]
}
