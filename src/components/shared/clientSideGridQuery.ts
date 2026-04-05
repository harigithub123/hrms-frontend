import type { GridQueryParams, GridQueryResult } from './DataGrid'

export type TextFilterModel = {
  filter?: string
  type?: string
}

export function matchesTextFilter(cell: string, model: TextFilterModel): boolean {
  const raw = (model.filter ?? '').trim()
  if (!raw) return true
  const f = raw.toLowerCase()
  const v = cell.toLowerCase()
  switch (model.type) {
    case 'equals':
      return v === f
    case 'notEqual':
      return v !== f
    case 'startsWith':
      return v.startsWith(f)
    case 'endsWith':
      return v.endsWith(f)
    default:
      return v.includes(f)
  }
}

export type ClientGridTextColumns<T> = Partial<Record<string, (row: T) => string>>
export type ClientGridSortColumns<T> = Partial<Record<string, (a: T, b: T, mul: number) => number>>

/** Slice/sort/filter in memory when the API returns the full list. */
export function applyClientSideGridQuery<T>(
  rows: T[],
  { page, pageSize, sortModel, filterModel }: GridQueryParams,
  {
    textColumns,
    sortColumns,
  }: {
    textColumns: ClientGridTextColumns<T>
    sortColumns: ClientGridSortColumns<T>
  },
): GridQueryResult<T> {
  let out = rows.filter((row) => {
    for (const [colId, getter] of Object.entries(textColumns)) {
      if (!getter) continue
      const model = filterModel[colId] as TextFilterModel | undefined
      if (model?.filter?.trim() && !matchesTextFilter(getter(row), model)) {
        return false
      }
    }
    return true
  })

  if (sortModel.length > 0) {
    const { colId, sort } = sortModel[0]
    const mul = sort === 'asc' ? 1 : -1
    const cmp = colId ? sortColumns[colId] : undefined
    if (cmp) {
      out = [...out].sort((a, b) => cmp(a, b, mul))
    }
  }

  const totalRows = out.length
  const start = page * pageSize
  return { rows: out.slice(start, start + pageSize), totalRows }
}
