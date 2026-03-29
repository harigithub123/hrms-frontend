import { useEffect, useState } from 'react'
import { Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { payrollApi } from '../api/client'
import type { Payslip } from '../types/hrms'
import { AppButton, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

export default function PayslipsPage() {
  const [list, setList] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    payrollApi
      .myPayslips()
      .then((p) => {
        setList(p)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const download = async (id: number) => {
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
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Payslips are tied to your employee record. A login account is created automatically when HR adds you as an
        employee.
      </AppTypography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Run</TableCell>
            <TableCell>Gross</TableCell>
            <TableCell>Deductions</TableCell>
            <TableCell>Net</TableCell>
            <TableCell align="right">PDF</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((p) => (
            <TableRow key={p.id}>
              <TableCell>#{p.payRunId}</TableCell>
              <TableCell>{p.grossAmount}</TableCell>
              <TableCell>{p.deductionAmount}</TableCell>
              <TableCell>{p.netAmount}</TableCell>
              <TableCell align="right">
                <AppButton size="small" onClick={() => download(p.id)}>
                  Download
                </AppButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && <AppTypography color="text.secondary">No payslips yet.</AppTypography>}
    </PageLayout>
  )
}
