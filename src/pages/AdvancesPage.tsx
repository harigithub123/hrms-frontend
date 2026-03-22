import { useEffect, useState } from 'react'
import { Alert, Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { advancesApi } from '../api/client'
import type { SalaryAdvance } from '../types/hrms'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

function fmt(n: string | number | null | undefined) {
  if (n == null) return '—'
  return typeof n === 'number' ? String(n) : n
}

export default function AdvancesPage() {
  const { hasRole } = useAuth()
  const hr = hasRole('HR') || hasRole('ADMIN')
  const [mine, setMine] = useState<SalaryAdvance[]>([])
  const [all, setAll] = useState<SalaryAdvance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [months, setMonths] = useState('3')
  const [submitErr, setSubmitErr] = useState('')

  const load = () => {
    setLoading(true)
    const p1 = advancesApi.mine().then(setMine).catch(() => setMine([]))
    const p2 = hr ? advancesApi.listAll().then(setAll).catch(() => setAll([])) : Promise.resolve()
    Promise.all([p1, p2])
      .then(() => setError(''))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [hr])

  const submit = async () => {
    setSubmitErr('')
    const a = Number(amount)
    const m = Number(months)
    if (!Number.isFinite(a) || a <= 0) {
      setSubmitErr('Enter a valid amount')
      return
    }
    try {
      await advancesApi.create({
        amount: a,
        reason: reason || undefined,
        recoveryMonths: Number.isFinite(m) && m > 0 ? m : 3,
      })
      setAmount('')
      setReason('')
      load()
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Failed')
    }
  }

  const approve = async (id: number) => {
    try {
      await advancesApi.approve(id, { recoveryMonths: 0 })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const reject = async (id: number) => {
    const r = window.prompt('Reason (optional)') ?? ''
    try {
      await advancesApi.reject(id, r || null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const markPaid = async (id: number) => {
    try {
      await advancesApi.markPaid(id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="Salary advances">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
          Request advance
        </AppTypography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems="flex-end">
          <AppTextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ width: 140 }}
            size="small"
          />
          <AppTextField
            label="Recovery months"
            type="number"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            sx={{ width: 140 }}
            size="small"
          />
          <AppTextField
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ minWidth: 220 }}
            size="small"
          />
          <AppButton variant="contained" onClick={submit}>
            Submit
          </AppButton>
        </Stack>
        {submitErr && (
          <AppTypography color="error" variant="body2" sx={{ mt: 1 }}>
            {submitErr}
          </AppTypography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
          <AppTypography variant="subtitle1" fontWeight={700}>
            My advances
          </AppTypography>
        </Box>
        <AdvTable rows={mine} mode="mine" />
      </Paper>

      {hr && (
        <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
            <AppTypography variant="subtitle1" fontWeight={700}>
              All advances (HR)
            </AppTypography>
          </Box>
          <AdvTable rows={all} mode="hr" onApprove={approve} onReject={reject} onPaid={markPaid} />
        </Paper>
      )}
    </PageLayout>
  )
}

function AdvTable({
  rows,
  mode,
  onApprove,
  onReject,
  onPaid,
}: {
  rows: SalaryAdvance[]
  mode: 'mine' | 'hr'
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
  onPaid?: (id: number) => void
}) {
  const showActions = mode === 'hr'
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {mode === 'hr' && <TableCell>Employee</TableCell>}
          <TableCell>Amount</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Outstanding</TableCell>
          <TableCell>Requested</TableCell>
          {showActions && <TableCell align="right">Actions</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={showActions ? 6 : 5}>
              <AppTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No records.
              </AppTypography>
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.id}>
            {mode === 'hr' && <TableCell>{r.employeeName}</TableCell>}
            <TableCell>
              {fmt(r.amount)} {r.currency}
            </TableCell>
            <TableCell>
              <Chip size="small" label={r.status} variant="outlined" />
            </TableCell>
            <TableCell>{fmt(r.outstandingBalance)}</TableCell>
            <TableCell>{r.requestedAt?.slice(0, 10)}</TableCell>
            {showActions && (
              <TableCell align="right">
                {r.status === 'PENDING' && onApprove && onReject && (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <AppButton size="small" variant="outlined" onClick={() => onApprove(r.id)}>
                      Approve
                    </AppButton>
                    <AppButton size="small" color="error" variant="outlined" onClick={() => onReject(r.id)}>
                      Reject
                    </AppButton>
                  </Stack>
                )}
                {r.status === 'APPROVED' && onPaid && (
                  <AppButton size="small" variant="contained" onClick={() => onPaid(r.id)}>
                    Mark paid
                  </AppButton>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
