import { Box, IconButton, Tooltip } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { SalaryComponentAdmin, SalaryComponentKind } from '../../types/hrms'

function kindLabel(k: SalaryComponentKind): string {
  return k === 'EARNING' ? 'Earning' : 'Deduction'
}

function FixedAmountCellRenderer(
  params: ICellRendererParams<SalaryComponentAdmin, unknown> & {
    onSetFixed?: (row: SalaryComponentAdmin) => void
    onClearFixed?: (row: SalaryComponentAdmin) => void
  },
) {
  if (!params.data) return null
  const row = params.data
  const has = row.fixedMonthlyAmount != null && String(row.fixedMonthlyAmount).trim() !== ''
  const formatted = has
    ? Number(row.fixedMonthlyAmount).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '—'

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Box sx={{ flex: 1, textAlign: 'right' }}>{formatted}</Box>
      <Tooltip title={has ? 'Edit fixed amount' : 'Set fixed amount'}>
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation()
            params.onSetFixed?.(row)
          }}
          aria-label="Set fixed amount"
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Clear fixed amount">
        <span>
          <IconButton
            size="small"
            color="error"
            disabled={!has}
            onClick={(e) => {
              e.stopPropagation()
              params.onClearFixed?.(row)
            }}
            aria-label="Clear fixed amount"
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  )
}

export function getSalaryComponentColumnDefs(opts?: {
  onSetFixed?: (row: SalaryComponentAdmin) => void
  onClearFixed?: (row: SalaryComponentAdmin) => void
}): ColDef<SalaryComponentAdmin>[] {
  return [
    { headerName: 'Code', field: 'code' },
    { headerName: 'Name', field: 'name' },
    {
      headerName: 'Kind',
      field: 'kind',
      valueFormatter: (p) => (p.value ? kindLabel(p.value as SalaryComponentKind) : '—'),
    },
    { headerName: 'Sort', field: 'sortOrder', width: 100 },
    {
      headerName: 'Fixed monthly',
      field: 'fixedMonthlyAmount',
      width: 200,
      sortable: false,
      filter: false,
      cellRenderer: FixedAmountCellRenderer,
      cellRendererParams: {
        onSetFixed: opts?.onSetFixed,
        onClearFixed: opts?.onClearFixed,
      },
    },
    {
      headerName: 'Active',
      field: 'active',
      valueFormatter: (p) => (p.value ? 'Yes' : 'No'),
    },
  ]
}
