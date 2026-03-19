import { useEffect, useState } from 'react'
import { Alert, Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { leaveRequestsApi } from '../api/client'
import type { LeaveRequest } from '../types/hrms'
import { AppButton, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

export default function LeaveApprovalsPage() {
  const [list, setList] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    leaveRequestsApi
      .listPending()
      .then((r) => {
        setList(r)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const decide = async (id: number, approve: boolean) => {
    setMsg('')
    try {
      await leaveRequestsApi.decide(id, { approve, comment: null })
      setMsg(approve ? 'Approved' : 'Rejected')
      load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="Leave approvals">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {msg && (
        <AppTypography variant="body2" sx={{ mb: 1 }} color={msg.includes('Failed') ? 'error' : 'text.secondary'}>
          {msg}
        </AppTypography>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Dates</TableCell>
            <TableCell>Days</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.employeeName}</TableCell>
              <TableCell>{r.leaveTypeCode}</TableCell>
              <TableCell>
                {r.startDate} → {r.endDate}
              </TableCell>
              <TableCell>{r.totalDays}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <AppButton size="small" variant="contained" color="success" onClick={() => decide(r.id, true)}>
                    Approve
                  </AppButton>
                  <AppButton size="small" color="error" onClick={() => decide(r.id, false)}>
                    Reject
                  </AppButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.length === 0 && <AppTypography color="text.secondary">No pending requests.</AppTypography>}
    </PageLayout>
  )
}
