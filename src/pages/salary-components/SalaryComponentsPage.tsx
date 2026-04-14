import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { payrollApi } from '../../api/client'
import type { SalaryComponentAdmin, SalaryComponentKind } from '../../types/hrms'
import { AppButton, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { DataGridActionConfig, GridQueryParams, GridQueryResult } from '../../components/shared'
import { getSalaryComponentColumnDefs } from './salaryComponentColumns'
import {
  EMPTY_SALARY_COMPONENT_FORM,
  SALARY_COMPONENT_FORM_CONFIG,
} from './salaryComponentFormConfig'
import type { SalaryComponentFormValues } from './salaryComponentFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

function validateSortOrder(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Sort order is required'
  const n = parseInt(trimmed, 10)
  if (!Number.isInteger(n) || n < 0) return 'Enter a non-negative integer'
  return ''
}

export default function SalaryComponentsPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryComponentAdmin | null>(null)
  const [formValues, setFormValues] = useState<SalaryComponentFormValues>(EMPTY_SALARY_COMPONENT_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SalaryComponentFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const validateField = useCallback((name: keyof SalaryComponentFormValues, value: string): string => {
    const field = SALARY_COMPONENT_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    if (name === 'sortOrder') return validateSortOrder(value)
    const trimmed = value.trim()
    if (field.required && !trimmed) return `${field.label} is required`
    if (field.maxLength && value.length > field.maxLength) return `${field.label} cannot exceed ${field.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: SalaryComponentFormValues) => {
      const nextErrors: Partial<Record<keyof SalaryComponentFormValues, string>> = {}
      for (const field of SALARY_COMPONENT_FORM_CONFIG) {
        const error = validateField(field.name, values[field.name])
        if (error) nextErrors[field.name] = error
      }
      return nextErrors
    },
    [validateField],
  )

  const fetchRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<SalaryComponentAdmin>> => {
    const all = await payrollApi.componentsAllWithFixed()
    const sorted = [...all].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    const start = page * pageSize
    return {
      rows: sorted.slice(start, start + pageSize),
      totalRows: sorted.length,
    }
  }, [])

  const handleFieldChange = useCallback((name: keyof SalaryComponentFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof SalaryComponentFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setEditing(null)
    setFormValues(EMPTY_SALARY_COMPONENT_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = useCallback((row: SalaryComponentAdmin) => {
    setEditing(row)
    setFormValues({
      name: row.name,
      kind: row.kind,
      sortOrder: String(row.sortOrder),
      active: row.active ? 'true' : 'false',
    })
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }, [])

  const close = () => setOpen(false)

  const refresh = () => setRefreshToken((value) => value + 1)

  const handleSubmit = async () => {
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    const body = {
      name: formValues.name.trim(),
      kind: formValues.kind as SalaryComponentKind,
      sortOrder: parseInt(formValues.sortOrder.trim(), 10),
      active: formValues.active === 'true',
    }

    try {
      if (editing) await payrollApi.updateComponent(editing.id, body)
      else await payrollApi.createComponent(body)
      close()
      refresh()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const actionConfig: DataGridActionConfig<SalaryComponentAdmin> = useMemo(
    () => ({ onEdit: openEdit }),
    [openEdit],
  )

  const columnDefs = useMemo(() => getSalaryComponentColumnDefs(), [])

  return (
    <PageLayout
      title="Salary components"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Add component
          </AppButton>
        </Box>
      }
    >
      <DataGrid<SalaryComponentAdmin>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 170px)"
      />

      <CommonInputForm<SalaryComponentFormValues>
        open={open}
        title={editing ? 'Edit salary component' : 'Add salary component'}
        fields={SALARY_COMPONENT_FORM_CONFIG}
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
