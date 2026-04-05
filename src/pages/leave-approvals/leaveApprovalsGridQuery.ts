import type { LeaveRequest } from '../../types/hrms'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { applyClientSideGridQuery } from '../../components/shared'

const textColumns = {
  employeeName: (r: LeaveRequest) => r.employeeName,
  leaveTypeCode: (r: LeaveRequest) => r.leaveTypeCode,
  dateRange: (r: LeaveRequest) => `${r.startDate} ${r.endDate}`,
  totalDays: (r: LeaveRequest) => r.totalDays,
}

const sortColumns = {
  employeeName: (a: LeaveRequest, b: LeaveRequest, mul: number) => mul * a.employeeName.localeCompare(b.employeeName),
  leaveTypeCode: (a: LeaveRequest, b: LeaveRequest, mul: number) => mul * a.leaveTypeCode.localeCompare(b.leaveTypeCode),
  dateRange: (a: LeaveRequest, b: LeaveRequest, mul: number) => mul * a.startDate.localeCompare(b.startDate),
  totalDays: (a: LeaveRequest, b: LeaveRequest, mul: number) =>
    mul * (parseFloat(a.totalDays) - parseFloat(b.totalDays)),
}

export function applyLeaveApprovalsGridQuery(
  rows: LeaveRequest[],
  params: GridQueryParams,
): GridQueryResult<LeaveRequest> {
  return applyClientSideGridQuery(rows, params, { textColumns, sortColumns })
}
