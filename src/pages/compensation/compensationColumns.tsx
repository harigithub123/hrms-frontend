import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Box, IconButton } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import type { EmployeeCompensation } from '../../types/hrms'
import { AppButton } from '../../components/ui'

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function val(v: unknown) {
  return v == null || v === '' ? '—' : String(v)
}

export type CompensationColumnCallbacks = {
  onViewLines: (row: EmployeeCompensation) => void
  onSyncStructure: (row: EmployeeCompensation) => void
}

type ViewLinesCellParams = ICellRendererParams<EmployeeCompensation, unknown> & {
  onViewLines?: (row: EmployeeCompensation) => void
}

function ViewLinesCell(params: ViewLinesCellParams) {
  if (!params.data || !params.onViewLines) return null
  return (
    <IconButton size="small" onClick={() => params.onViewLines!(params.data!)} aria-label="View lines">
      <VisibilityIcon fontSize="small" />
    </IconButton>
  )
}

type SyncCellParams = ICellRendererParams<EmployeeCompensation, unknown> & {
  onSyncStructure?: (row: EmployeeCompensation) => void
}

function SyncCell(params: SyncCellParams) {
  if (!params.data || !params.onSyncStructure) return null
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <AppButton size="small" variant="outlined" onClick={() => params.onSyncStructure!(params.data!)}>
        Sync to salary structure
      </AppButton>
    </Box>
  )
}

export function getCompensationColumnDefs(callbacks: CompensationColumnCallbacks): ColDef<EmployeeCompensation>[] {
  return [
    { headerName: 'From', field: 'effectiveFrom', minWidth: 120 },
    {
      headerName: 'To',
      colId: 'effectiveTo',
      valueGetter: (p) => p.data?.effectiveTo,
      valueFormatter: (p) => val(p.value),
    },
    {
      headerName: 'CTC',
      field: 'annualCtc',
      minWidth: 100,
      valueFormatter: (p) => val(p.value),
    },
    {
      headerName: 'Monthly payable',
      colId: 'monthlyPayable',
      sortable: false,
      filter: false,
      valueGetter: (p) =>
        (p.data?.lines ?? [])
          .filter((l) => l.frequency === 'MONTHLY')
          .reduce((s, l) => s + num(l.amount), 0),
      valueFormatter: (p) => (Number(p.value) > 0 ? String(p.value) : '—'),
    },
    {
      headerName: 'Annual bonus',
      colId: 'annualBonus',
      sortable: false,
      filter: false,
      valueGetter: (p) =>
        (p.data?.lines ?? [])
          .filter((l) => l.frequency === 'YEARLY' && l.componentCode === 'ANNUAL_BONUS')
          .reduce((s, l) => s + num(l.amount), 0),
      valueFormatter: (p) => (Number(p.value) > 0 ? String(p.value) : '—'),
    },
    {
      headerName: 'Joining bonus',
      colId: 'joiningBonus',
      sortable: false,
      filter: false,
      valueGetter: (p) =>
        (p.data?.lines ?? [])
          .filter((l) => l.frequency === 'ONE_TIME' && l.componentCode === 'JOINING_BONUS')
          .reduce((s, l) => s + num(l.amount), 0),
      valueFormatter: (p) => (Number(p.value) > 0 ? String(p.value) : '—'),
    },
    {
      headerName: 'Lines',
      colId: 'viewLines',
      sortable: false,
      filter: false,
      width: 88,
      flex: 0,
      cellRenderer: ViewLinesCell,
      cellRendererParams: { onViewLines: callbacks.onViewLines },
    },
    {
      headerName: 'Sync',
      colId: 'syncStructure',
      sortable: false,
      filter: false,
      flex: 0,
      minWidth: 200,
      cellRenderer: SyncCell,
      cellRendererParams: { onSyncStructure: callbacks.onSyncStructure },
    },
  ]
}
