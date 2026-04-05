import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Chip, Stack } from '@mui/material'
import type { SalaryAdvance } from '../../types/hrms'
import { AppButton } from '../../components/ui'

function fmt(n: string | number | null | undefined) {
  if (n == null) return '—'
  return typeof n === 'number' ? String(n) : n
}

export type AdvanceHrActionHandlers = {
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onPaid: (id: number) => void
}

function StatusCell({ value }: { value: string }) {
  return <Chip size="small" label={value} variant="outlined" />
}

function HrActionsCell(
  params: ICellRendererParams<SalaryAdvance, unknown> & { handlers?: AdvanceHrActionHandlers },
) {
  const r = params.data
  const handlers = params.handlers
  if (!r || !handlers) return null
  return (
    <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
      {r.status === 'PENDING' && (
        <>
          <AppButton size="small" variant="outlined" onClick={() => handlers.onApprove(r.id)}>
            Approve
          </AppButton>
          <AppButton size="small" color="error" variant="outlined" onClick={() => handlers.onReject(r.id)}>
            Reject
          </AppButton>
        </>
      )}
      {r.status === 'APPROVED' && (
        <AppButton size="small" variant="contained" onClick={() => handlers.onPaid(r.id)}>
          Mark paid
        </AppButton>
      )}
    </Stack>
  )
}

function baseAdvanceDataColumns(): ColDef<SalaryAdvance>[] {
  return [
    {
      headerName: 'Amount',
      flex: 1,
      minWidth: 120,
      valueGetter: (p) => {
        const row = p.data
        if (!row) return ''
        return `${fmt(row.amount)} ${row.currency}`
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      maxWidth: 160,
      cellRenderer: (p: ICellRendererParams<SalaryAdvance>) =>
        p.data ? <StatusCell value={p.data.status} /> : null,
    },
    {
      headerName: 'Outstanding',
      field: 'outstandingBalance',
      flex: 1,
      minWidth: 120,
      valueFormatter: (p) => fmt(p.value as string | number | null | undefined),
    },
    {
      headerName: 'Requested',
      field: 'requestedAt',
      flex: 1,
      minWidth: 120,
      valueFormatter: (p) => {
        const v = p.value as string | undefined
        return v ? v.slice(0, 10) : '—'
      },
    },
  ]
}

export function getMineAdvanceColumnDefs(): ColDef<SalaryAdvance>[] {
  return baseAdvanceDataColumns()
}

export function getHrAdvanceColumnDefs(handlers: AdvanceHrActionHandlers): ColDef<SalaryAdvance>[] {
  return [
    {
      headerName: 'Employee',
      field: 'employeeName',
      flex: 1,
      minWidth: 160,
    },
    ...baseAdvanceDataColumns(),
    {
      headerName: 'Actions',
      colId: '__advanceHrActions__',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      width: 220,
      cellRenderer: (p: ICellRendererParams<SalaryAdvance, unknown>) => (
        <HrActionsCell {...p} handlers={handlers} />
      ),
    },
  ]
}
