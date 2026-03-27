import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { departmentsApi } from '../../api/client'
import type { Department, DepartmentRequest } from '../../types/org'
import { AppButton, PageLayout } from '../../components/ui'
import {
  CommonInputForm,
  DataGrid,
} from '../../components/shared'
import type {
  DataGridActionConfig,
  GridQueryParams,
  GridQueryResult,
} from '../../components/shared'
import { getDepartmentColumnDefs } from './departmentColumns'
import {
  DEPARTMENT_FORM_CONFIG,
  EMPTY_DEPARTMENT_FORM,
} from './departmentFormConfig'
import type { DepartmentFormValues } from './departmentFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function DepartmentsPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [formValues, setFormValues] = useState<DepartmentFormValues>(EMPTY_DEPARTMENT_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DepartmentFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const validateField = useCallback((name: keyof DepartmentFormValues, value: string): string => {
    const field = DEPARTMENT_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    const trimmed = value.trim()
    if (field.required && !trimmed) return `${field.label} is required`
    if (field.maxLength && value.length > field.maxLength) return `${field.label} cannot exceed ${field.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback((values: DepartmentFormValues) => {
    const nextErrors: Partial<Record<keyof DepartmentFormValues, string>> = {}
    for (const field of DEPARTMENT_FORM_CONFIG) {
      const error = validateField(field.name, values[field.name])
      if (error) nextErrors[field.name] = error
    }
    return nextErrors
  }, [validateField])

  const fetchDepartmentRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<Department>> => {
    const paged = await departmentsApi.list(page, pageSize)
    return {
      rows: paged.content,
      totalRows: paged.totalElements,
    }
  }, [])

  const handleFieldChange = useCallback((name: keyof DepartmentFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback((name: keyof DepartmentFormValues) => {
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
  }, [formValues, validateField])

  const openCreate = () => {
    setEditing(null)
    setFormValues(EMPTY_DEPARTMENT_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = useCallback((row: Department) => {
    setEditing(row)
    setFormValues({
      name: row.name,
      code: row.code ?? '',
      description: row.description ?? '',
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

    const body: DepartmentRequest = {
      name: formValues.name.trim(),
      code: formValues.code.trim() || null,
      description: formValues.description.trim() || null,
    }

    try {
      if (editing) await departmentsApi.update(editing.id, body)
      else await departmentsApi.create(body)
      close()
      setRefreshToken((value) => value + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this department?')) return
    try {
      await departmentsApi.delete(id)
      setRefreshToken((value) => value + 1)
    } catch {
      // ignore
    }
  }, [])

  const actionConfig: DataGridActionConfig<Department> = useMemo(
    () => ({ onEdit: openEdit, onDelete: (row) => handleDelete(row.id) }),
    [handleDelete, openEdit],
  )

  const departmentColumns = useMemo(() => getDepartmentColumnDefs(), [])

  return (
    <PageLayout
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">Back</AppButton>
          <AppButton variant="contained" onClick={openCreate}>Add department</AppButton>
        </Box>
      }
    >
      <DataGrid<Department>
        columnDefs={departmentColumns}
        fetchRows={fetchDepartmentRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 170px)"
      />

      <CommonInputForm<DepartmentFormValues>
        open={open}
        title={editing ? 'Edit department' : 'Add department'}
        fields={DEPARTMENT_FORM_CONFIG}
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
