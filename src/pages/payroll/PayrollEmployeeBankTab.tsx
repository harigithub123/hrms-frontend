import { useCallback, useMemo, useState } from 'react'
import { Alert, Box } from '@mui/material'
import { payrollBankApi } from '../../api/client'
import type { EmployeePayrollBankSummary } from '../../types/hrms'
import type { Employee } from '../../types/org'
import { AppTypography } from '../../components/ui'
import { DataGrid } from '../../components/shared'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { EmployeePayrollBankDialog } from '../employees/EmployeePayrollBankDialog'
import { getPayrollBankSummaryColumnDefs } from './payrollBankSummaryColumns'
import { PayrollBankHistoryDialog } from './PayrollBankHistoryDialog'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

function summaryToEmployee(row: EmployeePayrollBankSummary): Employee {
  return {
    id: row.employeeId,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: null,
    departmentId: null,
    departmentName: row.departmentName,
    designationId: null,
    designationName: null,
    managerId: null,
    managerName: null,
    joinedAt: null,
    employmentStatus: 'JOINED',
    lastWorkingDate: null,
    exitReason: null,
  }
}

export function PayrollEmployeeBankTab() {
  const [loadError, setLoadError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [bankRow, setBankRow] = useState<EmployeePayrollBankSummary | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyRow, setHistoryRow] = useState<EmployeePayrollBankSummary | null>(null)

  const openAddNew = useCallback((row: EmployeePayrollBankSummary) => {
    setBankRow(row)
    setBankDialogOpen(true)
  }, [])

  const openHistory = useCallback((row: EmployeePayrollBankSummary) => {
    setHistoryRow(row)
    setHistoryOpen(true)
  }, [])

  const columnDefs = useMemo(
    () =>
      getPayrollBankSummaryColumnDefs({
        onAddNew: openAddNew,
        onHistory: openHistory,
      }),
    [openAddNew, openHistory],
  )

  const fetchRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<EmployeePayrollBankSummary>> => {
      try {
        const list = await payrollBankApi.listEmployeeSummaries()
        setLoadError('')
        const start = page * pageSize
        return {
          rows: list.slice(start, start + pageSize),
          totalRows: list.length,
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load')
        return { rows: [], totalRows: 0 }
      }
    },
    [],
  )

  const historyName = historyRow
    ? `${historyRow.firstName} ${historyRow.lastName}`.trim()
    : ''

  return (
    <Box>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Active payroll bank details per employee. Use the plus button to add a new bank record with an effective date
        (existing active details are not edited here). Use the info icon for audit history.
      </AppTypography>
      <DataGrid<EmployeePayrollBankSummary>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.employeeId)}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 260px)"
      />
      <EmployeePayrollBankDialog
        open={bankDialogOpen}
        addNewOnly
        employee={bankRow ? summaryToEmployee(bankRow) : null}
        onClose={() => {
          setBankDialogOpen(false)
          setBankRow(null)
        }}
        onSaved={() => setRefreshToken((v) => v + 1)}
      />
      <PayrollBankHistoryDialog
        open={historyOpen}
        employeeId={historyRow?.employeeId ?? null}
        employeeDisplayName={historyName}
        onClose={() => {
          setHistoryOpen(false)
          setHistoryRow(null)
        }}
      />
    </Box>
  )
}
