import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Box, IconButton, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { EmployeePayrollBankSummary } from '../../types/hrms'

function maskAccount(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  const d = raw.replace(/\s/g, '')
  if (d.length <= 4) return '****'
  return '****' + d.slice(-4)
}

export function getPayrollBankSummaryColumnDefs(opts: {
  onAddNew: (row: EmployeePayrollBankSummary) => void
  onHistory: (row: EmployeePayrollBankSummary) => void
}): ColDef<EmployeePayrollBankSummary>[] {
  return [
    {
      headerName: 'Code',
      width: 110,
      valueGetter: (p) => p.data?.employeeCode ?? '—',
    },
    {
      headerName: 'Name',
      flex: 1.1,
      minWidth: 150,
      valueGetter: (p) => `${p.data?.firstName ?? ''} ${p.data?.lastName ?? ''}`.trim(),
    },
    {
      headerName: 'Department',
      flex: 0.9,
      minWidth: 120,
      valueGetter: (p) => p.data?.departmentName ?? '—',
    },
    {
      headerName: 'Account holder',
      flex: 1,
      minWidth: 130,
      valueGetter: (p) => p.data?.bankDetails?.accountHolderName ?? '—',
    },
    {
      headerName: 'Bank',
      flex: 1,
      minWidth: 120,
      valueGetter: (p) => p.data?.bankDetails?.bankName ?? '—',
    },
    {
      headerName: 'IFSC',
      width: 120,
      valueGetter: (p) => p.data?.bankDetails?.ifscCode ?? '—',
    },
    {
      headerName: 'Account',
      width: 100,
      valueGetter: (p) => maskAccount(p.data?.bankDetails?.accountNumber),
    },
    {
      headerName: 'Type',
      width: 100,
      valueGetter: (p) => p.data?.bankDetails?.accountType ?? '—',
    },
    {
      headerName: 'Effective from',
      width: 130,
      valueGetter: (p) => {
        const ef = p.data?.bankDetails?.effectiveFrom
        if (ef == null || ef === '') return '—'
        try {
          return new Date(ef + 'T12:00:00').toLocaleDateString()
        } catch {
          return ef
        }
      },
    },
    {
      headerName: '',
      width: 88,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: (params: ICellRendererParams<EmployeePayrollBankSummary>) => {
        const row = params.data
        if (!row) return null
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.25,
              height: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Tooltip title="Add new bank details">
              <IconButton size="small" color="primary" onClick={() => opts.onAddNew(row)} aria-label="Add new bank details">
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="View bank account history">
              <IconButton size="small" onClick={() => opts.onHistory(row)} aria-label="Bank history">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
    },
  ]
}
