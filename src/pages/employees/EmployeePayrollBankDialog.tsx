import { useEffect, useState } from 'react'
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { payrollBankApi } from '../../api/client'
import type { EmployeePayrollBankContext, PayrollBankAudit } from '../../types/hrms'
import type { Employee } from '../../types/org'
import { AppButton, AppTypography } from '../../components/ui'
import { PayrollBankDetailsForm } from '../../components/payroll/PayrollBankDetailsForm'

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed'
}

type EmployeePayrollBankDialogProps = {
  open: boolean
  employee: Employee | null
  onClose: () => void
  onSaved: () => void
}

export function EmployeePayrollBankDialog({ open, employee, onClose, onSaved }: EmployeePayrollBankDialogProps) {
  const [context, setContext] = useState<EmployeePayrollBankContext | null>(null)
  const [audits, setAudits] = useState<PayrollBankAudit[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [auditError, setAuditError] = useState('')

  useEffect(() => {
    if (!open || !employee) return
    let cancelled = false
    payrollBankApi
      .getByEmployee(employee.id)
      .then((ctx) => {
        if (!cancelled) {
          setContext(ctx)
          setLoadError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(toErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [open, employee])

  const loadAudits = () => {
    if (!employee) return
    setAuditError('')
    payrollBankApi
      .audits(employee.id)
      .then(setAudits)
      .catch((e) => setAuditError(toErrorMessage(e)))
  }

  const handleClose = () => {
    setContext(null)
    setAudits(null)
    setLoadError('')
    setAuditError('')
    onClose()
  }

  const title = employee ? `${employee.firstName} ${employee.lastName} — payroll bank` : 'Payroll bank'

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}
        {!loadError && employee && context === null && (
          <AppTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Loading…
          </AppTypography>
        )}
        {!loadError && context && employee && (
          <>
            {!context.linked && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No onboarding case is linked to this employee. You can still maintain payroll bank details; they are
                stored on the employee payroll record.
              </Alert>
            )}
            <PayrollBankDetailsForm
              bankDetails={context.bankDetails}
              disabled={false}
              showHeading={false}
              onSave={async (body) => {
                const next = await payrollBankApi.saveByEmployee(employee.id, {
                  accountHolderName: body.accountHolderName,
                  bankName: body.bankName,
                  branch: body.branch,
                  accountNumber: body.accountNumber,
                  ifscCode: body.ifscCode,
                  accountType: body.accountType,
                  notes: body.notes,
                  effectiveFrom: body.effectiveFrom,
                })
                setContext(next)
                setAudits(null)
                onSaved()
              }}
            />
            <AppTypography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Changes are written to the employee payroll bank store and audited. If an onboarding case exists, it is
              kept in sync for reference.
            </AppTypography>
            <AppButton variant="text" size="small" sx={{ mt: 1 }} onClick={loadAudits}>
              Load audit history
            </AppButton>
            {auditError && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {auditError}
              </Alert>
            )}
            {audits && audits.length > 0 && (
              <BoxAudits audits={audits} />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={handleClose}>Close</AppButton>
      </DialogActions>
    </Dialog>
  )
}

function BoxAudits({ audits }: { audits: PayrollBankAudit[] }) {
  return (
    <Box sx={{ mt: 1, pl: 1, borderLeft: 2, borderColor: 'divider' }}>
      {audits.slice(0, 20).map((a) => (
        <AppTypography key={a.id} variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
          {new Date(a.createdAt).toLocaleString()}
          {a.createdByUsername ? ` · ${a.createdByUsername}` : ''} · {a.action}
          {a.detail ? `: ${a.detail}` : ''}
        </AppTypography>
      ))}
    </Box>
  )
}
