import type { AttendanceRecord } from '../../types/hrms'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { applyClientSideGridQuery } from '../../components/shared'

const textColumns = {
  workDate: (r: AttendanceRecord) => r.workDate,
  status: (r: AttendanceRecord) => r.status,
  checkIn: (r: AttendanceRecord) => r.checkIn ?? '',
  checkOut: (r: AttendanceRecord) => r.checkOut ?? '',
  notes: (r: AttendanceRecord) => r.notes ?? '',
}

const sortColumns = {
  workDate: (a: AttendanceRecord, b: AttendanceRecord, mul: number) => mul * a.workDate.localeCompare(b.workDate),
  status: (a: AttendanceRecord, b: AttendanceRecord, mul: number) => mul * a.status.localeCompare(b.status),
  checkIn: (a: AttendanceRecord, b: AttendanceRecord, mul: number) =>
    mul * (a.checkIn ?? '').localeCompare(b.checkIn ?? ''),
  checkOut: (a: AttendanceRecord, b: AttendanceRecord, mul: number) =>
    mul * (a.checkOut ?? '').localeCompare(b.checkOut ?? ''),
  notes: (a: AttendanceRecord, b: AttendanceRecord, mul: number) =>
    mul * (a.notes ?? '').localeCompare(b.notes ?? ''),
}

export function applyAttendanceGridQuery(
  rows: AttendanceRecord[],
  params: GridQueryParams,
): GridQueryResult<AttendanceRecord> {
  return applyClientSideGridQuery(rows, params, { textColumns, sortColumns })
}
