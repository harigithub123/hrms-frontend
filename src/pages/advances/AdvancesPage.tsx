import { useCallback, useMemo, useState } from 'react'
import { Alert, Box } from '@mui/material'
import { advancesApi } from '../../api/client'
import type { SalaryAdvance } from '../../types/hrms'
import { useAuth } from '../../contexts/AuthContext'
import { AppButton, AppTypography, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { getHrAdvanceColumnDefs, getMineAdvanceColumnDefs } from './advanceColumns'
import {
  ADVANCE_REQUEST_FORM_CONFIG,
  EMPTY_ADVANCE_REQUEST_FORM,
} from './advanceFormConfig'
import type { AdvanceRequestFormValues } from './advanceFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function AdvancesPage() {
  const { hasRole } = useAuth()
  const hr = hasRole('HR') || hasRole('ADMIN')
  const [refreshToken, setRefreshToken] = useState(0)
  const [open, setOpen] = useState(false)
  const [formValues, setFormValues] = useState<AdvanceRequestFormValues>(EMPTY_ADVANCE_REQUEST_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AdvanceRequestFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [pageError, setPageError] = useState('')

  const validateField = useCallback((name: keyof AdvanceRequestFormValues, value: string): string => {
    const field = ADVANCE_REQUEST_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    if (name === 'amount') {
      const n = Number(value)
      if (!value.trim() || !Number.isFinite(n) || n <= 0) return 'Enter a valid amount'
      return ''
    }
    if (name === 'recoveryMonths') {
      if (!value.trim()) return ''
      const n = Number(value)
      if (!Number.isFinite(n) || n < 1) return 'Enter at least 1 recovery month'
      return ''
    }
    if (name === 'reason' && field.maxLength && value.length > field.maxLength) {
      return `${field.label} cannot exceed ${field.maxLength} characters`
    }
    return ''
  }, [])

  const validateForm = useCallback(
    (values: AdvanceRequestFormValues) => {
      const nextErrors: Partial<Record<keyof AdvanceRequestFormValues, string>> = {}
      for (const field of ADVANCE_REQUEST_FORM_CONFIG) {
        const error = validateField(field.name, values[field.name])
        if (error) nextErrors[field.name] = error
      }
      return nextErrors
    },
    [validateField],
  )

  const fetchMineRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<SalaryAdvance>> => {
    const all = await advancesApi.mine().catch(() => [] as SalaryAdvance[])
    const start = page * pageSize
    return {
      rows: all.slice(start, start + pageSize),
      totalRows: all.length,
    }
  }, [])

  const fetchAllRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<SalaryAdvance>> => {
    const all = await advancesApi.listAll().catch(() => [] as SalaryAdvance[])
    const start = page * pageSize
    return {
      rows: all.slice(start, start + pageSize),
      totalRows: all.length,
    }
  }, [])

  const handleFieldChange = useCallback((name: keyof AdvanceRequestFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof AdvanceRequestFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openRequest = () => {
    setFormValues(EMPTY_ADVANCE_REQUEST_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    const a = Number(formValues.amount)
    const m = Number(formValues.recoveryMonths)
    try {
      await advancesApi.create({
        amount: a,
        reason: formValues.reason.trim() || undefined,
        recoveryMonths: Number.isFinite(m) && m > 0 ? m : 3,
      })
      close()
      setRefreshToken((v) => v + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const approve = useCallback(async (id: number) => {
    setPageError('')
    try {
      await advancesApi.approve(id, { recoveryMonths: 0 })
      setRefreshToken((v) => v + 1)
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed')
    }
  }, [])

  const reject = useCallback(async (id: number) => {
    setPageError('')
    const r = window.prompt('Reason (optional)') ?? ''
    try {
      await advancesApi.reject(id, r || null)
      setRefreshToken((v) => v + 1)
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed')
    }
  }, [])

  const markPaid = useCallback(async (id: number) => {
    setPageError('')
    try {
      await advancesApi.markPaid(id)
      setRefreshToken((v) => v + 1)
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed')
    }
  }, [])

  const hrHandlers = useMemo(
    () => ({ onApprove: approve, onReject: reject, onPaid: markPaid }),
    [approve, markPaid, reject],
  )

  const mineColumns = useMemo(() => getMineAdvanceColumnDefs(), [])
  const hrColumns = useMemo(() => getHrAdvanceColumnDefs(hrHandlers), [hrHandlers])

  return (
    <PageLayout
      title="Salary advances"
      maxWidth="none"
      actions={
        <AppButton variant="contained" onClick={openRequest}>
          Request advance
        </AppButton>
      }
    >
      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError('')}>
          {pageError}
        </Alert>
      )}

      <AppTypography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        My advances
      </AppTypography>
      <DataGrid<SalaryAdvance>
        columnDefs={mineColumns}
        fetchRows={fetchMineRows}
        getRowId={(row) => String(row.id)}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(50svh - 120px)"
      />

      {hr && (
        <Box sx={{ mt: 3 }}>
          <AppTypography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            All advances (HR)
          </AppTypography>
          <DataGrid<SalaryAdvance>
            columnDefs={hrColumns}
            fetchRows={fetchAllRows}
            getRowId={(row) => String(row.id)}
            refreshToken={refreshToken}
            defaultPageSize={10}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            height="calc(50svh - 120px)"
          />
        </Box>
      )}

      <CommonInputForm<AdvanceRequestFormValues>
        open={open}
        title="Request advance"
        fields={ADVANCE_REQUEST_FORM_CONFIG}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={close}
        onSubmit={handleSubmit}
        submitLabel="Submit"
        fieldsPerRow={2}
      />
    </PageLayout>
  )
}
