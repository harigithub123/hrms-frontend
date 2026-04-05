import type { ColDef } from 'ag-grid-community'
import type { AttendanceRecord } from '../../types/hrms'

export function getAttendanceColumnDefs(): ColDef<AttendanceRecord>[] {
  return [
    { headerName: 'Date', field: 'workDate', width: 130, maxWidth: 160 },
    { headerName: 'Status', field: 'status', width: 120, maxWidth: 140 },
    { headerName: 'Check in', field: 'checkIn', width: 110, valueFormatter: (p) => p.value ?? '—' },
    { headerName: 'Check out', field: 'checkOut', width: 110, valueFormatter: (p) => p.value ?? '—' },
    {
      headerName: 'Notes',
      field: 'notes',
      flex: 1,
      valueFormatter: (p) => p.value ?? '—',
    },
  ]
}
