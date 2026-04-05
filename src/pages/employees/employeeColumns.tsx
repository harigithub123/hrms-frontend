import type { ColDef } from 'ag-grid-community'
import type { Employee } from '../../types/org'

export function getEmployeeColumnDefs(): ColDef<Employee>[] {
  return [
     {
      headerName: 'Code',
      field: 'employeeCode',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Name',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (p) => `${p.data?.firstName ?? ''} ${p.data?.lastName ?? ''}`.trim(),
    },
    {
      headerName: 'Department',
      field: 'departmentName',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Designation',
      field: 'designationName',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
    {
      headerName: 'Manager',
      field: 'managerName',
      valueFormatter: (p) => (p.value == null || p.value === '' ? '—' : String(p.value)),
    },
  ]
}
