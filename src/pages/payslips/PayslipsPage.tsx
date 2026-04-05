import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box } from '@mui/material'
import { payrollApi } from '../../api/client'
import type { Payslip } from '../../types/hrms'
import { AppTypography, PageLayout } from '../../components/ui'
import { DataGrid, type GridQueryParams } from '../../components/shared'
import { applyPayslipsGridQuery } from './payslipsGridQuery'
import { getPayslipColumnDefs } from './payslipsColumns'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [listLoadError, setListLoadError] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const load = useCallback(async () => {
    try {
      const p = await payrollApi.myPayslips()
      setPayslips(p)
      setListLoadError('')
    } catch (e) {
      setListLoadError(e instanceof Error ? e.message : 'Failed to load')
      setPayslips([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const download = useCallback(async (id: number) => {
    setDownloadError('')
    try {
      const blob = await payrollApi.downloadPayslipPdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed')
    }
  }, [])

  const fetchRows = useCallback(
    async (params: GridQueryParams) => {
      if (listLoadError) throw new Error(listLoadError)
      return applyPayslipsGridQuery(payslips, params)
    },
    [payslips, listLoadError],
  )

  const columnDefs = useMemo(() => getPayslipColumnDefs(download), [download])

  return (
    <PageLayout maxWidth="none">
      {downloadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDownloadError('')}>
          {downloadError}
        </Alert>
      )}
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Payslips are tied to your employee record. A login account is created automatically when HR adds you as an
        employee.
      </AppTypography>
      <Box sx={{ mb: 2 }}>
        <DataGrid<Payslip>
          columnDefs={columnDefs}
          fetchRows={fetchRows}
          getRowId={(row) => String(row.id)}
          defaultPageSize={10}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          height="calc(100svh - 220px)"
        />
      </Box>
    </PageLayout>
  )
}
