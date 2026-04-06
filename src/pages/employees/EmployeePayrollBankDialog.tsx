import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { payrollBankApi } from '../../api/client'
import type { EmployeePayrollBankContext } from '../../types/hrms'
import type { Employee } from '../../types/org'
import { AppButton, AppTextField, AppTypography } from '../../components/ui'
import { getFormFieldsGridSx } from '../../components/shared'
import type { GenericFormFieldConfig } from '../../components/shared'
import {
  PAYROLL_BANK_FORM_CONFIG,
  createEmptyPayrollBankForm,
  todayIsoDate,
  type PayrollBankFormValues,
} from './employeePayrollBankFormConfig'

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed'
}

type EmployeePayrollBankDialogProps = {
  open: boolean
  employee: Employee | null
  onClose: () => void
  onSaved: () => void
  /**
   * When true (payroll tab): form is always empty for a new bank change; current active bank is shown read-only only.
   * When false: form is initialised from existing bank details (legacy; no callers today).
   */
  addNewOnly?: boolean
}

const FORM_COLS = 2

function renderFormField(
  field: GenericFormFieldConfig<PayrollBankFormValues>,
  values: PayrollBankFormValues,
  errors: Partial<Record<keyof PayrollBankFormValues, string>>,
  onFieldChange: (name: keyof PayrollBankFormValues, value: string) => void,
  onFieldBlur: (name: keyof PayrollBankFormValues) => void,
) {
  if (field.type === 'select') {
    return (
      <FormControl fullWidth size="small" margin="dense" error={!!errors[field.name]} required={field.required}>
        <InputLabel>{field.label}</InputLabel>
        <Select
          label={field.label}
          value={values[field.name]}
          onChange={(e) => onFieldChange(field.name, e.target.value as string)}
          onBlur={() => onFieldBlur(field.name)}
        >
          <MenuItem value="">
            <em>—</em>
          </MenuItem>
          {(field.selectOptions ?? []).map((opt) => (
            <MenuItem key={`${field.name}-${opt.value}`} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
        {errors[field.name] ? <FormHelperText>{errors[field.name]}</FormHelperText> : null}
      </FormControl>
    )
  }

  const inputType = field.type === 'date' ? 'date' : 'text'

  return (
    <AppTextField
      size="small"
      label={field.label}
      type={inputType}
      value={values[field.name]}
      onChange={(event) => onFieldChange(field.name, event.target.value)}
      onBlur={() => onFieldBlur(field.name)}
      error={!!errors[field.name]}
      helperText={errors[field.name]}
      margin="dense"
      required={field.required}
      multiline={field.multiline}
      rows={field.rows}
      inputProps={field.maxLength ? { maxLength: field.maxLength } : undefined}
      InputLabelProps={inputType === 'date' ? { shrink: true } : undefined}
      fullWidth
    />
  )
}

function formatDisplayDate(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—'
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString()
  } catch {
    return iso
  }
}

export function EmployeePayrollBankDialog({
  open,
  employee,
  onClose,
  onSaved,
  addNewOnly = false,
}: EmployeePayrollBankDialogProps) {
  const [context, setContext] = useState<EmployeePayrollBankContext | null>(null)
  const [loadError, setLoadError] = useState('')
  const [formValues, setFormValues] = useState<PayrollBankFormValues>(createEmptyPayrollBankForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PayrollBankFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    if (!open || !employee || !context) return
    if (addNewOnly) {
      setFormValues(createEmptyPayrollBankForm())
    } else {
      const bd = context.bankDetails
      if (!bd) {
        setFormValues(createEmptyPayrollBankForm())
      } else {
        setFormValues({
          accountHolderName: bd.accountHolderName ?? '',
          bankName: bd.bankName ?? '',
          branch: bd.branch ?? '',
          accountNumber: bd.accountNumber ?? '',
          ifscCode: bd.ifscCode ?? '',
          accountType: bd.accountType ?? 'SAVINGS',
          notes: bd.notes ?? '',
          effectiveFrom: bd.effectiveFrom?.slice(0, 10) ?? todayIsoDate(),
        })
      }
    }
    setFormErrors({})
    setSubmitError('')
  }, [open, employee?.id, context, context?.bankDetails?.id, context?.bankDetails?.updatedAt, addNewOnly])

  const validateField = useCallback((name: keyof PayrollBankFormValues, value: string): string => {
    const field = PAYROLL_BANK_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    const trimmed = value.trim()
    if (field.required && !trimmed) return `${field.label} is required`
    if (field.maxLength && value.length > field.maxLength) return `${field.label} cannot exceed ${field.maxLength} characters`
    if (name === 'effectiveFrom' && trimmed) {
      const today = todayIsoDate()
      if (trimmed < today) {
        return 'Effective date cannot be in the past; backdating can conflict with payslips already processed.'
      }
    }
    return ''
  }, [])

  const validateForm = useCallback(
    (values: PayrollBankFormValues) => {
      const next: Partial<Record<keyof PayrollBankFormValues, string>> = {}
      for (const field of PAYROLL_BANK_FORM_CONFIG) {
        const error = validateField(field.name, values[field.name])
        if (error) next[field.name] = error
      }
      return next
    },
    [validateField],
  )

  const handleFieldChange = useCallback((name: keyof PayrollBankFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof PayrollBankFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const handleClose = () => {
    setContext(null)
    setLoadError('')
    setSubmitError('')
    setFormErrors({})
    setFormValues(createEmptyPayrollBankForm())
    onClose()
  }

  const handleSubmit = async () => {
    if (!employee) return
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    setSaving(true)
    try {
      const nextCtx = await payrollBankApi.saveByEmployee(employee.id, {
        accountHolderName: formValues.accountHolderName.trim(),
        bankName: formValues.bankName.trim(),
        branch: formValues.branch.trim() || null,
        accountNumber: formValues.accountNumber.trim(),
        ifscCode: formValues.ifscCode.trim(),
        accountType: formValues.accountType.trim(),
        notes: formValues.notes.trim() || null,
        effectiveFrom: formValues.effectiveFrom.trim(),
      })
      setContext(nextCtx)
      onSaved()
    } catch (e) {
      setSubmitError(toErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const name = employee ? `${employee.firstName} ${employee.lastName}`.trim() : ''
  const title =
    addNewOnly && name ? `${name} — add payroll bank` : employee ? `${name} — payroll bank` : 'Payroll bank'

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
            {addNewOnly && context.bankDetails && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Current active bank (read-only): {context.bankDetails.bankName} · IFSC {context.bankDetails.ifscCode} ·
                effective {formatDisplayDate(context.bankDetails.effectiveFrom)}. Enter the new bank details below; the
                active record updates only after you add with a valid effective date.
              </Alert>
            )}
            {submitError && (
              <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>
                {submitError}
              </AppTypography>
            )}
            <Box sx={getFormFieldsGridSx(FORM_COLS)}>
              {PAYROLL_BANK_FORM_CONFIG.map((field) => (
                <Box
                  key={field.name}
                  sx={{
                    minWidth: 0,
                    gridColumn: {
                      xs: '1 / -1',
                      sm: FORM_COLS <= 1 || field.fullRow ? '1 / -1' : 'span 1',
                    },
                  }}
                >
                  {renderFormField(field, formValues, formErrors, handleFieldChange, handleFieldBlur)}
                </Box>
              ))}
            </Box>
            <AppTypography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              {addNewOnly
                ? 'New details are saved to the payroll bank store with your effective date and audited. Existing rows are not edited in this form. Use the history icon on the grid to review past versions.'
                : 'Changes are written to the employee payroll bank store and audited. If an onboarding case exists, it is kept in sync for reference. Use Payroll → Employee bank details → history to view past changes.'}
            </AppTypography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <AppButton onClick={handleClose}>Cancel</AppButton>
        <AppButton variant="contained" onClick={handleSubmit} disabled={saving || !context || !!loadError}>
          {addNewOnly ? 'Add' : 'Save'}
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}
