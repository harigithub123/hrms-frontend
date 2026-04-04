import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box } from '@mui/material'
import { payrollApi } from '../../api/client'
import type { PayRun, Payslip } from '../../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../../components/ui'
import { DataGrid } from '../../components/shared'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { getPayRunColumnDefs, getPayslipColumnDefs } from './payrollColumns'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function PayrollPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [runs, setRuns] = useState<PayRun[]>([])
  const [runsRefresh, setRunsRefresh] = useState(0)
  const [runStart, setRunStart] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [runEnd, setRunEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedRun, setSelectedRun] = useState<number | ''>('')
  const [payslips, setPayslips] = useState<Payslip[]>([])

  const loadRuns = () => payrollApi.payRuns().then(setRuns)

  useEffect(() => {
    setLoading(true)
    loadRuns()
      .then(() => setError(''))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedRun === '') {
      setPayslips([])
      return
    }
    payrollApi
      .payslipsForRun(selectedRun as number)
      .then(setPayslips)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [selectedRun])

  const createRun = async () => {
    try {
      await payrollApi.createPayRun({ periodStart: runStart, periodEnd: runEnd })
      await loadRuns()
      setRunsRefresh((v) => v + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const downloadPdf = useCallback(async (id: number) => {
    try {
      const blob = await payrollApi.downloadPayslipPdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }, [])

  const fetchRunRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<PayRun>> => ({
      rows: runs.slice(page * pageSize, page * pageSize + pageSize),
      totalRows: runs.length,
    }),
    [runs],
  )

  const fetchPayslipRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<Payslip>> => {
      if (selectedRun === '') {
        return { rows: [], totalRows: 0 }
      }
      return {
        rows: payslips.slice(page * pageSize, page * pageSize + pageSize),
        totalRows: payslips.length,
      }
    },
    [payslips, selectedRun],
  )

  const payRunColumns = useMemo(
    () =>
      getPayRunColumnDefs({
        onViewPayslips: (row) => setSelectedRun(row.id),
      }),
    [],
  )

  const payslipColumns = useMemo(
    () =>
      getPayslipColumnDefs({
        onDownload: (row) => void downloadPdf(row.id),
      }),
    [downloadPdf],
  )

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Payroll"
      maxWidth="none"
      actions={
        <AppButton component={Link} to="/hr/compensation" variant="outlined">
          Compensation (HR)
        </AppButton>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, mb: 2 }}>
        <AppTextField
          sx={{ width: 180 }}
          label="Period start"
          type="date"
          value={runStart}
          onChange={(e) => setRunStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <AppTextField
          sx={{ width: 180 }}
          label="Period end"
          type="date"
          value={runEnd}
          onChange={(e) => setRunEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <AppButton variant="contained" onClick={createRun} sx={{ width: 150 }}>
          Generate pay run
        </AppButton>
      </Box>
      <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
        Runs
      </AppTypography>
      <DataGrid<PayRun>
        columnDefs={payRunColumns}
        fetchRows={fetchRunRows}
        getRowId={(row) => String(row.id)}
        refreshToken={runsRefresh}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 300px)"
      />

      {selectedRun !== '' && (
        <>
          <AppTypography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Payslips (run {selectedRun})
          </AppTypography>
          <DataGrid<Payslip>
            columnDefs={payslipColumns}
            fetchRows={fetchPayslipRows}
            getRowId={(row) => String(row.id)}
            refreshToken={selectedRun}
            defaultPageSize={10}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            height="calc(100svh - 380px)"
          />
        </>
      )}
    </PageLayout>
  )
}
