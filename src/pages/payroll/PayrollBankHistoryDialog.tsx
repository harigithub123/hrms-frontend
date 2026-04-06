import { useEffect, useState } from 'react'
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { payrollBankApi } from '../../api/client'
import type { PayrollBankAudit } from '../../types/hrms'
import { AppButton, AppTypography } from '../../components/ui'

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed'
}

type PayrollBankHistoryDialogProps = {
  open: boolean
  employeeId: number | null
  employeeDisplayName: string
  onClose: () => void
}

export function PayrollBankHistoryDialog({
  open,
  employeeId,
  employeeDisplayName,
  onClose,
}: PayrollBankHistoryDialogProps) {
  const [rows, setRows] = useState<PayrollBankAudit[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || employeeId == null) {
      setRows(null)
      setError('')
      return
    }
    let cancelled = false
    setError('')
    setRows(null)
    payrollBankApi
      .audits(employeeId)
      .then((list) => {
        if (!cancelled) setRows(list)
      })
      .catch((e) => {
        if (!cancelled) setError(toErrorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [open, employeeId])

  const handleClose = () => {
    setRows(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        Bank account history
        {employeeDisplayName ? ` — ${employeeDisplayName}` : ''}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!error && rows === null && (
          <AppTypography variant="body2" color="text.secondary">
            Loading…
          </AppTypography>
        )}
        {!error && rows && rows.length === 0 && (
          <AppTypography variant="body2" color="text.secondary">
            No history recorded yet.
          </AppTypography>
        )}
        {!error && rows && rows.length > 0 && (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Effective from</TableCell>
                <TableCell>Recorded at</TableCell>
                <TableCell>By</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {a.effectiveFrom
                      ? new Date(a.effectiveFrom + 'T12:00:00').toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{a.createdByUsername ?? '—'}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell sx={{ maxWidth: 360, wordBreak: 'break-word' }}>
                    {a.detail ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={handleClose}>Close</AppButton>
      </DialogActions>
    </Dialog>
  )
}
