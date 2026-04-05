import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Box } from '@mui/material'
import { attendanceApi, employeesApi } from '../../api/client'
import type { Employee } from '../../types/org'
import type { AttendanceRecord, AttendanceStatus } from '../../types/hrms'
import { AppButton, AppTextField, AppTypography, PageLayout } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import {
  CommonInputForm,
  DataGrid,
  type GenericFormFieldConfig,
  type GridQueryParams,
} from '../../components/shared'
import { getAttendanceColumnDefs } from './attendanceColumns'
import { applyAttendanceGridQuery } from './attendanceGridQuery'
import {
  ATTENDANCE_ENTRY_FORM_CONFIG,
  EMPTY_ATTENDANCE_ENTRY_FORM,
  type AttendanceEntryFormValues,
} from './attendanceFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function AttendancePage() {
  const { hasRole } = useAuth()
  const isHr = hasRole('HR') || hasRole('ADMIN')

  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [listLoadError, setListLoadError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  const [open, setOpen] = useState(false)
  const [formValues, setFormValues] = useState<AttendanceEntryFormValues>(EMPTY_ATTENDANCE_ENTRY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AttendanceEntryFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    employeesApi.listAll().then(setEmployees).catch(() => {})
  }, [])

  const formFields = useMemo((): Array<GenericFormFieldConfig<AttendanceEntryFormValues>> => {
    const employeeField: GenericFormFieldConfig<AttendanceEntryFormValues> = {
      name: 'employeeId',
      label: 'Employee',
      type: 'select',
      required: true,
      fullRow: true,
      selectOptions: employees.map((e) => ({
        value: String(e.id),
        label: `${e.firstName} ${e.lastName}`.trim() || `Employee #${e.id}`,
      })),
    }
    return [employeeField, ...ATTENDANCE_ENTRY_FORM_CONFIG]
  }, [employees])

  useEffect(() => {
    if (employeeId === '') {
      setRecords([])
      setListLoadError('')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const rows = await attendanceApi.list(employeeId as number, from, to)
        if (!cancelled) {
          setRecords(rows)
          setListLoadError('')
        }
      } catch (e) {
        if (!cancelled) {
          setListLoadError(e instanceof Error ? e.message : 'Failed to load')
          setRecords([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [employeeId, from, to, refreshToken])

  const validateField = useCallback(
    (name: keyof AttendanceEntryFormValues, value: string): string => {
      const field = formFields.find((item) => item.name === name)
      if (!field) return ''
      const trimmed = value.trim()
      if (field.required && !trimmed) return `${field.label} is required`
      return ''
    },
    [formFields],
  )

  const validateForm = useCallback(
    (values: AttendanceEntryFormValues) => {
      const next: Partial<Record<keyof AttendanceEntryFormValues, string>> = {}
      for (const field of formFields) {
        const error = validateField(field.name, values[field.name])
        if (error) next[field.name] = error
      }
      return next
    },
    [formFields, validateField],
  )

  const handleFieldChange = useCallback((name: keyof AttendanceEntryFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof AttendanceEntryFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setFormValues({
      ...EMPTY_ATTENDANCE_ENTRY_FORM,
      employeeId: employeeId === '' ? '' : String(employeeId),
    })
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

    const id = Number(formValues.employeeId)
    if (!Number.isFinite(id) || id <= 0) {
      setSubmitError('Select an employee')
      return
    }

    setSaving(true)
    try {
      await attendanceApi.upsert({
        employeeId: id,
        workDate: formValues.workDate,
        checkIn: formValues.checkIn.trim() || null,
        checkOut: formValues.checkOut.trim() || null,
        status: formValues.status as AttendanceStatus,
        notes: formValues.notes.trim() || null,
      })
      close()
      setEmployeeId(id)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const fetchRows = useCallback(
    async (params: GridQueryParams) => {
      if (employeeId === '') return { rows: [] as AttendanceRecord[], totalRows: 0 }
      if (listLoadError) throw new Error(listLoadError)
      return applyAttendanceGridQuery(records, params)
    },
    [employeeId, records, listLoadError],
  )

  const columnDefs = useMemo(() => getAttendanceColumnDefs(), [])

  const selectedEmployee = useMemo(
    () => (employeeId === '' ? null : employees.find((e) => e.id === employeeId) ?? null),
    [employeeId, employees],
  )

  return (
    <PageLayout
      maxWidth="none"
      actions={isHr ? <AppButton variant="contained" onClick={openCreate}>Add / edit day</AppButton> : null}
    >
      {listLoadError && employeeId !== '' && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setListLoadError('')}>
          {listLoadError}
        </Alert>
      )}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Autocomplete
          size="small"
          options={employees}
          getOptionLabel={(e) => `${e.firstName} ${e.lastName}`.trim() || `Employee #${e.id}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          value={selectedEmployee}
          onChange={(_, v) => setEmployeeId(v?.id ?? '')}
          sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: { xs: '100%', sm: 420 } }}
          renderInput={(params) => (
            <AppTextField {...params} label="Employee" placeholder="Search by name…" />
          )}
        />
        <AppTextField
          label="From"
          type="date"
          value={from}
          onChange={(ev) => setFrom(ev.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 160 }, flexShrink: 0 }}
        />
        <AppTextField
          label="To"
          type="date"
          value={to}
          onChange={(ev) => setTo(ev.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 160 }, flexShrink: 0 }}
        />
      </Box>

      {!isHr && (
        <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Recording attendance is restricted to HR/Admin. You can view your own or your team’s attendance when your user is
          linked to an employee.
        </AppTypography>
      )}

      <DataGrid<AttendanceRecord>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 280px)"
      />

      <CommonInputForm<AttendanceEntryFormValues>
        open={open}
        title="Attendance entry"
        fields={formFields}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={close}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submitDisabled={saving}
      />
    </PageLayout>
  )
}
