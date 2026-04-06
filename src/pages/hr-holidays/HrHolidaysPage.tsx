import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { holidaysApi } from '../../api/client'
import type { Holiday } from '../../types/hrms'
import { AppButton, AppTextField, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { DataGridActionConfig, GridQueryParams, GridQueryResult } from '../../components/shared'
import { getHolidayColumnDefs } from './holidayColumns'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

type HolidayFormValues = {
  holidayDate: string
  name: string
}

const EMPTY_HOLIDAY_FORM: HolidayFormValues = {
  holidayDate: '',
  name: '',
}

const HOLIDAY_FIELDS: Array<{
  name: keyof HolidayFormValues
  label: string
  type: 'date' | 'text'
  required?: boolean
  maxLength?: number
}> = [
  { name: 'holidayDate', label: 'Holiday date', type: 'date', required: true },
  { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 200 },
]

export default function HrHolidaysPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [yearDraft, setYearDraft] = useState(() => String(new Date().getFullYear()))
  const [refreshToken, setRefreshToken] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [formValues, setFormValues] = useState<HolidayFormValues>(EMPTY_HOLIDAY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HolidayFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const applyYear = () => {
    const y = parseInt(yearDraft.trim(), 10)
    if (!Number.isFinite(y) || y < 1970 || y > 2100) return
    setYear(y)
    setYearDraft(String(y))
    setRefreshToken((v) => v + 1)
  }

  const validateForm = (values: HolidayFormValues) => {
    const next: Partial<Record<keyof HolidayFormValues, string>> = {}
    for (const f of HOLIDAY_FIELDS) {
      const v = values[f.name].trim()
      if (f.required && !v) next[f.name] = `${f.label} is required`
      else if (f.maxLength && values[f.name].length > f.maxLength) {
        next[f.name] = `${f.label} cannot exceed ${f.maxLength} characters`
      }
    }
    return next
  }

  const fetchRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<Holiday>> => {
      const all = await holidaysApi.list(year)
      const start = page * pageSize
      return {
        rows: all.slice(start, start + pageSize),
        totalRows: all.length,
      }
    },
    [year],
  )

  const formFields = useMemo(
    () =>
      HOLIDAY_FIELDS.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required,
        maxLength: f.maxLength,
      })),
    [],
  )

  const handleFieldChange = useCallback((name: keyof HolidayFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof HolidayFormValues) => {
      const errors = validateForm(formValues)
      setFormErrors((prev) => ({ ...prev, [name]: errors[name] ?? '' }))
    },
    [formValues],
  )

  const openCreate = () => {
    setEditing(null)
    setFormValues({
      holidayDate: `${year}-01-01`,
      name: '',
    })
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = useCallback((row: Holiday) => {
    setEditing(row)
    setFormValues({
      holidayDate: row.holidayDate.slice(0, 10),
      name: row.name,
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

    const body = {
      holidayDate: formValues.holidayDate.trim(),
      name: formValues.name.trim(),
    }

    try {
      if (editing) await holidaysApi.update(editing.id, body)
      else await holidaysApi.create(body)
      close()
      setRefreshToken((v) => v + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this holiday?')) return
    try {
      await holidaysApi.delete(id)
      setRefreshToken((v) => v + 1)
    } catch {
      // ignore
    }
  }, [])

  const actionConfig: DataGridActionConfig<Holiday> = useMemo(
    () => ({ onEdit: openEdit, onDelete: (row) => handleDelete(row.id) }),
    [handleDelete, openEdit],
  )

  const columnDefs = useMemo(() => getHolidayColumnDefs(), [])

  return (
    <PageLayout
      title="Company holidays"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Add holiday
          </AppButton>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
        <AppTextField
          label="Year"
          type="number"
          value={yearDraft}
          onChange={(e) => setYearDraft(e.target.value)}
          sx={{ width: 120 }}
          InputLabelProps={{ shrink: true }}
        />
        <AppButton variant="outlined" onClick={applyYear}>
          Load year
        </AppButton>
      </Box>

      <DataGrid<Holiday>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 220px)"
      />

      <CommonInputForm<HolidayFormValues>
        open={open}
        title={editing ? 'Edit holiday' : 'Add holiday'}
        fields={formFields}
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
