import type { UserSummary } from '../../types/hrms'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { applyClientSideGridQuery } from '../../components/shared'

const textColumns = {
  username: (u: UserSummary) => u.username,
  employeeId: (u: UserSummary) => (u.employeeId != null ? String(u.employeeId) : ''),
}

const sortColumns = {
  username: (a: UserSummary, b: UserSummary, mul: number) => mul * a.username.localeCompare(b.username),
  employeeId: (a: UserSummary, b: UserSummary, mul: number) => {
    const av = a.employeeId
    const bv = b.employeeId
    if (av == null && bv == null) return 0
    if (av == null) return mul * 1
    if (bv == null) return mul * -1
    return mul * (av < bv ? -1 : av > bv ? 1 : 0)
  },
}

/** Client-side slice/sort/filter for APIs that return the full list (e.g. `/users`). */
export function applyUserRolesGridQuery(
  users: UserSummary[],
  params: GridQueryParams,
): GridQueryResult<UserSummary> {
  return applyClientSideGridQuery(users, params, { textColumns, sortColumns })
}
