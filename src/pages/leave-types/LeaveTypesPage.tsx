import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { leaveTypesApi } from '../../api/client'
import type { LeaveType } from '../../types/hrms'
import { AppButton, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { DataGridActionConfig, GridQueryParams, GridQueryResult } from '../../components/shared'
import { getLeaveTypeColumnDefs } from './leaveTypeColumns'
import {
  EMPTY_LEAVE_TYPE_FORM,
  LEAVE_TYPE_FORM_CONFIG,
} from './leaveTypeFormConfig'
import type { LeaveTypeFormValues } from './leaveTypeFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

function validateDaysPerYear(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Days per year is required'
  const n = parseFloat(trimmed)
  if (!Number.isFinite(n) || n <= 0) return 'Enter a positive number'
  return ''
}

function optionalNonNegativeNumber(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const n = parseFloat(trimmed)
  if (!Number.isFinite(n) || n < 0) return `${label} must be empty or a non-negative number`
  return ''
}

function optionalDecimalField(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed)
  return Number.isFinite(n) ? n : null
}

function formatTypeDecimal(v: string | number | null | undefined): string {
  if (v == null || v === '') return ''
  return String(v)
}

export default function LeaveTypesPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveType | null>(null)
  const [formValues, setFormValues] = useState<LeaveTypeFormValues>(EMPTY_LEAVE_TYPE_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LeaveTypeFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const validateField = useCallback((name: keyof LeaveTypeFormValues, value: string): string => {
    const field = LEAVE_TYPE_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    if (name === 'daysPerYear') return validateDaysPerYear(value)
    if (name === 'maxCarryForwardPerYear') return optionalNonNegativeNumber(value, field.label)
    if (name === 'maxCarryForward') return optionalNonNegativeNumber(value, field.label)
    const trimmed = value.trim()
    if (field.required && !trimmed) return `${field.label} is required`
    if (field.maxLength && value.length > field.maxLength) return `${field.label} cannot exceed ${field.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: LeaveTypeFormValues) => {
      const nextErrors: Partial<Record<keyof LeaveTypeFormValues, string>> = {}
      const fields =
        values.carryForward === 'true'
          ? LEAVE_TYPE_FORM_CONFIG
          : LEAVE_TYPE_FORM_CONFIG.filter(
              (f) => f.name !== 'maxCarryForwardPerYear' && f.name !== 'maxCarryForward',
            )
      for (const field of fields) {
        const error = validateField(field.name, values[field.name])
        if (error) nextErrors[field.name] = error
      }
      return nextErrors
    },
    [validateField],
  )

  const visibleFormFields = useMemo(
    () =>
      formValues.carryForward === 'true'
        ? LEAVE_TYPE_FORM_CONFIG
        : LEAVE_TYPE_FORM_CONFIG.filter(
            (f) => f.name !== 'maxCarryForwardPerYear' && f.name !== 'maxCarryForward',
          ),
    [formValues.carryForward],
  )

  const fetchRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<LeaveType>> => {
    const all = await leaveTypesApi.listAll()
    const start = page * pageSize
    return {
      rows: all.slice(start, start + pageSize),
      totalRows: all.length,
    }
  }, [])

  const handleFieldChange = useCallback((name: keyof LeaveTypeFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof LeaveTypeFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setEditing(null)
    setFormValues(EMPTY_LEAVE_TYPE_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = useCallback((row: LeaveType) => {
    setEditing(row)
    setFormValues({
      name: row.name,
      code: row.code,
      daysPerYear: row.daysPerYear != null && row.daysPerYear !== '' ? String(row.daysPerYear) : '',
      carryForward: row.carryForward ? 'true' : 'false',
      maxCarryForwardPerYear: formatTypeDecimal(row.maxCarryForwardPerYear),
      maxCarryForward: formatTypeDecimal(row.maxCarryForward),
      paid: row.paid ? 'true' : 'false',
      active: row.active ? 'true' : 'false',
    })
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }, [])

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    const daysPerYear = parseFloat(formValues.daysPerYear.trim())
    const carryForward = formValues.carryForward === 'true'
    const body = {
      name: formValues.name.trim(),
      code: formValues.code.trim(),
      daysPerYear,
      carryForward,
      maxCarryForwardPerYear: carryForward ? optionalDecimalField(formValues.maxCarryForwardPerYear) : null,
      maxCarryForward: carryForward ? optionalDecimalField(formValues.maxCarryForward) : null,
      paid: formValues.paid === 'true',
      active: formValues.active === 'true',
    }

    try {
      if (editing) await leaveTypesApi.update(editing.id, body)
      else await leaveTypesApi.create(body)
      close()
      setRefreshToken((value) => value + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this leave type?')) return
    try {
      await leaveTypesApi.delete(id)
      setRefreshToken((value) => value + 1)
    } catch {
      // ignore
    }
  }, [])

  const actionConfig: DataGridActionConfig<LeaveType> = useMemo(
    () => ({ onEdit: openEdit, onDelete: (row) => handleDelete(row.id) }),
    [handleDelete, openEdit],
  )

  const columnDefs = useMemo(() => getLeaveTypeColumnDefs(), [])

  return (
    <PageLayout
      title="Leave types"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Add leave type
          </AppButton>
        </Box>
      }
    >
      <DataGrid<LeaveType>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 170px)"
      />

      <CommonInputForm<LeaveTypeFormValues>
        open={open}
        title={editing ? 'Edit leave type' : 'Add leave type'}
        fields={visibleFormFields}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={close}
        onSubmit={handleSubmit}
        submitLabel="Save"
      />
    </PageLayout>
  )
}
