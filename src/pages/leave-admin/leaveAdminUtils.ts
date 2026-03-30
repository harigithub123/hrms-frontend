import type { GridQueryParams, GridQueryResult } from '../../components/shared'

export function num(v: string | undefined | null): number {
  const n = parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

export function clientSlice<T>(all: T[], params: GridQueryParams): GridQueryResult<T> {
  const start = params.page * params.pageSize
  return {
    rows: all.slice(start, start + params.pageSize),
    totalRows: all.length,
  }
}
