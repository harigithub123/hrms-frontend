import { useEffect, useState } from 'react'
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { onboardingApi } from '../../api/client'
import type { EmployeePayrollBankContext } from '../../types/hrms'
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
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!open || !employee) return
    let cancelled = false
    onboardingApi
      .getPayrollBankByEmployee(employee.id)
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

  const handleClose = () => {
    setContext(null)
    setLoadError('')
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
        {!loadError && context && !context.linked && (
          <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This employee is not linked to an onboarding case. Payroll bank details in this system are stored on the
            onboarding record. Use onboarding for new hires, or add a dedicated employee bank store if you need
            directory-only employees on payroll.
          </AppTypography>
        )}
        {!loadError && context?.linked && employee && (
          <PayrollBankDetailsForm
            bankDetails={context.bankDetails}
            disabled={false}
            showHeading={false}
            onSave={async (body) => {
              await onboardingApi.savePayrollBankByEmployee(employee.id, {
                accountHolderName: body.accountHolderName,
                bankName: body.bankName,
                branch: body.branch,
                accountNumber: body.accountNumber,
                ifscCode: body.ifscCode,
                accountType: body.accountType,
                notes: body.notes,
              })
              const next = await onboardingApi.getPayrollBankByEmployee(employee.id)
              setContext(next)
              onSaved()
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={handleClose}>Close</AppButton>
      </DialogActions>
    </Dialog>
  )
}
