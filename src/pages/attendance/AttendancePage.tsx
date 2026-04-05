import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { attendanceApi, employeesApi } from '../../api/client'
import type { Employee } from '../../types/org'
import type { AttendanceRecord, AttendanceStatus } from '../../types/hrms'
import { AppButton, AppTextField, AppTypography, PageLayout } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { CommonInputForm, DataGrid, type GridQueryParams } from '../../components/shared'
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

  const validateField = useCallback((name: keyof AttendanceEntryFormValues, value: string): string => {
    const field = ATTENDANCE_ENTRY_FORM_CONFIG.find((item) => item.name === name)
    if (!field) return ''
    const trimmed = value.trim()
    if (field.required && !trimmed) return `${field.label} is required`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: AttendanceEntryFormValues) => {
      const next: Partial<Record<keyof AttendanceEntryFormValues, string>> = {}
      for (const field of ATTENDANCE_ENTRY_FORM_CONFIG) {
        const error = validateField(field.name, values[field.name])
        if (error) next[field.name] = error
      }
      return next
    },
    [validateField],
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
    setFormValues(EMPTY_ATTENDANCE_ENTRY_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    if (employeeId === '') return
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    setSaving(true)
    try {
      await attendanceApi.upsert({
        employeeId: employeeId as number,
        workDate: formValues.workDate,
        checkIn: formValues.checkIn.trim() || null,
        checkOut: formValues.checkOut.trim() || null,
        status: formValues.status as AttendanceStatus,
        notes: formValues.notes.trim() || null,
      })
      close()
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

  return (
    <PageLayout
      maxWidth="none"
      actions={
        isHr ? (
          <AppButton variant="contained" disabled={employeeId === ''} onClick={openCreate}>
            Add / edit day
          </AppButton>
        ) : null
      }
    >
      {listLoadError && employeeId !== '' && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setListLoadError('')}>
          {listLoadError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Employee</InputLabel>
          <Select
            label="Employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <MenuItem value="">—</MenuItem>
            {employees.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <AppTextField
          label="From"
          type="date"
          value={from}
          onChange={(ev) => setFrom(ev.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <AppTextField
          label="To"
          type="date"
          value={to}
          onChange={(ev) => setTo(ev.target.value)}
          InputLabelProps={{ shrink: true }}
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
        fields={ATTENDANCE_ENTRY_FORM_CONFIG}
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
