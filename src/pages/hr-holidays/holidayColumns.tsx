import type { ColDef } from 'ag-grid-community'
import type { Holiday } from '../../types/hrms'

export function getHolidayColumnDefs(): ColDef<Holiday>[] {
  return [
    {
      headerName: 'Date',
      width: 140,
      valueGetter: (p) => {
        const d = p.data?.holidayDate
        if (d == null || d === '') return '—'
        try {
          return new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        } catch {
          return d
        }
      },
    },
    {
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      field: 'name',
    },
  ]
}
