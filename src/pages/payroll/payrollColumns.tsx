import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Box } from '@mui/material'
import type { PayRun, Payslip } from '../../types/hrms'
import { AppButton } from '../../components/ui'

type ViewPayslipsParams = ICellRendererParams<PayRun, unknown> & {
  onViewPayslips?: (row: PayRun) => void
}

function ViewPayslipsCell(params: ViewPayslipsParams) {
  if (!params.data || !params.onViewPayslips) return null
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <AppButton size="small" onClick={() => params.onViewPayslips!(params.data!)}>
        View payslips
      </AppButton>
    </Box>
  )
}

export type PayRunColumnCallbacks = {
  onViewPayslips: (row: PayRun) => void
}

export function getPayRunColumnDefs(callbacks: PayRunColumnCallbacks): ColDef<PayRun>[] {
  return [
    { headerName: 'ID', field: 'id', maxWidth: 90, filter: 'agNumberColumnFilter' },
    {
      headerName: 'Period',
      minWidth: 220,
      valueGetter: (p) =>
        p.data ? `${p.data.periodStart} → ${p.data.periodEnd}` : '',
      sortable: false,
      filter: false,
    },
    { headerName: 'Status', field: 'status', minWidth: 120 },
    {
      headerName: 'Actions',
      colId: 'viewPayslips',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      minWidth: 140,
      cellRenderer: ViewPayslipsCell,
      cellRendererParams: { onViewPayslips: callbacks.onViewPayslips },
    },
  ]
}

type DownloadPayslipParams = ICellRendererParams<Payslip, unknown> & {
  onDownload?: (row: Payslip) => void
}

function DownloadPayslipCell(params: DownloadPayslipParams) {
  if (!params.data || !params.onDownload) return null
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <AppButton size="small" onClick={() => params.onDownload!(params.data!)}>
        Download
      </AppButton>
    </Box>
  )
}

export type PayslipColumnCallbacks = {
  onDownload: (row: Payslip) => void
}

export function getPayslipColumnDefs(callbacks: PayslipColumnCallbacks): ColDef<Payslip>[] {
  return [
    { headerName: 'Employee', field: 'employeeName', minWidth: 160 },
    {
      headerName: 'Gross',
      field: 'grossAmount',
      maxWidth: 120,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Deductions',
      field: 'deductionAmount',
      maxWidth: 120,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Net',
      field: 'netAmount',
      maxWidth: 120,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'PDF',
      colId: 'pdf',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      minWidth: 120,
      cellRenderer: DownloadPayslipCell,
      cellRendererParams: { onDownload: callbacks.onDownload },
    },
  ]
}
