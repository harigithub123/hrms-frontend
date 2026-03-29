import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { designationsApi } from '../../api/client'
import type { Designation, DesignationRequest } from '../../types/org'
import { AppButton, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { DataGridActionConfig, GridQueryParams, GridQueryResult } from '../../components/shared'
import { getDesignationColumnDefs } from './designationColumns'
import {
  DESIGNATION_FORM_CONFIG,
  EMPTY_DESIGNATION_FORM,
} from './designationFormConfig'
import type { DesignationFormValues } from './designationFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function DesignationsPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [formValues, setFormValues] = useState<DesignationFormValues>(EMPTY_DESIGNATION_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DesignationFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const validateField = useCallback((name: keyof DesignationFormValues, value: string): string => {
    const field = DESIGNATION_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    const trimmed = value.trim()
    if (field.required && !trimmed) return `${field.label} is required`
    if (field.maxLength && value.length > field.maxLength) return `${field.label} cannot exceed ${field.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: DesignationFormValues) => {
      const nextErrors: Partial<Record<keyof DesignationFormValues, string>> = {}
      for (const field of DESIGNATION_FORM_CONFIG) {
        const error = validateField(field.name, values[field.name])
        if (error) nextErrors[field.name] = error
      }
      return nextErrors
    },
    [validateField],
  )

  const fetchRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<Designation>> => {
    const paged = await designationsApi.list(page, pageSize)
    return {
      rows: paged.content,
      totalRows: paged.totalElements,
    }
  }, [])

  const handleFieldChange = useCallback((name: keyof DesignationFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof DesignationFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setEditing(null)
    setFormValues(EMPTY_DESIGNATION_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = useCallback((row: Designation) => {
    setEditing(row)
    setFormValues({
      name: row.name,
      code: row.code ?? '',
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

    const body: DesignationRequest = {
      name: formValues.name.trim(),
      code: formValues.code.trim() || null,
    }

    try {
      if (editing) await designationsApi.update(editing.id, body)
      else await designationsApi.create(body)
      close()
      setRefreshToken((value) => value + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this designation?')) return
    try {
      await designationsApi.delete(id)
      setRefreshToken((value) => value + 1)
    } catch {
      // ignore
    }
  }, [])

  const actionConfig: DataGridActionConfig<Designation> = useMemo(
    () => ({ onEdit: openEdit, onDelete: (row) => handleDelete(row.id) }),
    [handleDelete, openEdit],
  )

  const columnDefs = useMemo(() => getDesignationColumnDefs(), [])

  return (
    <PageLayout
      title="Designations"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Add designation
          </AppButton>
        </Box>
      }
    >
      <DataGrid<Designation>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 170px)"
      />

      <CommonInputForm<DesignationFormValues>
        open={open}
        title={editing ? 'Edit designation' : 'Add designation'}
        fields={DESIGNATION_FORM_CONFIG}
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
