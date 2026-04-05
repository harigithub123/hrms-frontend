import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { employeesApi, leaveBalancesApi, leaveTypesApi } from '../../api/client'
import type { Employee } from '../../types/org'
import type { LeaveBalance, LeaveBalanceAdjustment, LeaveBalanceAdjustmentKind, LeaveType } from '../../types/hrms'
import { AppButton, AppTextField, LoadingSpinner, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import {
  ALLOCATE_LEAVE_DIALOG_TITLE,
  EMPTY_ALLOCATE_LEAVE_FORM,
  getAllocateLeaveFormFields,
  type AllocateLeaveFormValues,
} from './allocateLeaveFormConfig'
import {
  BALANCE_DETAILS_PANEL_TITLE,
  LEAVE_BALANCE_PANEL_TITLE,
  LEAVE_TYPES_SECTION_TITLE,
} from './leaveAdminCopy'
import { getLeaveAdminAdjustmentColumnDefs } from './leaveAdminAdjustmentColumns'
import { getLeaveAdminBalanceColumnDefs } from './leaveAdminBalanceColumns'
import { getLeaveAdminLeaveTypeColumnDefs } from './leaveAdminLeaveTypeColumns'
import { clientSlice } from './leaveAdminUtils'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]
const LEAVE_TYPES_GRID_HEIGHT = 'min(320px, calc((100svh - 420px) / 3))'
const SPLIT_PANEL_GRID_HEIGHT = 'min(520px, calc(100svh - 380px))'

export default function LeaveAdminPage() {
  const [types, setTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [adjustments, setAdjustments] = useState<LeaveBalanceAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [allocateOpen, setAllocateOpen] = useState(false)
  const [allocateValues, setAllocateValues] = useState<AllocateLeaveFormValues>(EMPTY_ALLOCATE_LEAVE_FORM)
  const [allocateErrors, setAllocateErrors] = useState<Partial<Record<keyof AllocateLeaveFormValues, string>>>({})
  const [allocateSubmitError, setAllocateSubmitError] = useState('')

  const allocateFields = useMemo(() => getAllocateLeaveFormFields(types), [types])

  const loadTypes = () => leaveTypesApi.listAll().then(setTypes).catch(() => {})
  const loadEmployees = () => employeesApi.listAll().then(setEmployees).catch(() => {})

  const loadBalances = () => {
    if (employeeId === '') return Promise.resolve()
    return leaveBalancesApi.list(employeeId as number, year).then(setBalances)
  }

  const loadAdjustments = () => {
    if (employeeId === '') return Promise.resolve()
    return leaveBalancesApi.listAdjustments(employeeId as number, year).then(setAdjustments)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadTypes(), loadEmployees()])
      .then(() => setError(''))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (employeeId === '') return
    Promise.all([loadBalances(), loadAdjustments()]).catch((e) =>
      setError(e instanceof Error ? e.message : 'Failed'),
    )
  }, [employeeId, year])

  const leaveTypeColumnDefs = useMemo(() => getLeaveAdminLeaveTypeColumnDefs(), [])
  const balanceColumnDefs = useMemo(() => getLeaveAdminBalanceColumnDefs(), [])
  const adjustmentColumnDefs = useMemo(() => getLeaveAdminAdjustmentColumnDefs(), [])

  const fetchLeaveTypeRows = useCallback(
    async (params: GridQueryParams): Promise<GridQueryResult<LeaveType>> => {
      return clientSlice(types, params)
    },
    [types],
  )

  const fetchBalanceRows = useCallback(
    async (params: GridQueryParams): Promise<GridQueryResult<LeaveBalance>> => {
      if (employeeId === '') {
        return { rows: [], totalRows: 0 }
      }
      return clientSlice(balances, params)
    },
    [employeeId, balances],
  )

  const fetchAdjustmentRows = useCallback(
    async (params: GridQueryParams): Promise<GridQueryResult<LeaveBalanceAdjustment>> => {
      if (employeeId === '') {
        return { rows: [], totalRows: 0 }
      }
      return clientSlice(adjustments, params)
    },
    [employeeId, adjustments],
  )

  const validateAllocateField = useCallback(
    (name: keyof AllocateLeaveFormValues, value: string): string => {
      const field = allocateFields.find((item) => item.name === name)
      if (!field) return ''
      if (name === 'deltaDays') {
        const n = parseFloat(value.trim())
        if (!Number.isFinite(n) || n === 0) {
          return 'Enter a non-zero number of days'
        }
        return ''
      }
      const trimmed = value.trim()
      if (field.required && !trimmed) return `${field.label} is required`
      if (field.maxLength && value.length > field.maxLength) {
        return `${field.label} cannot exceed ${field.maxLength} characters`
      }
      return ''
    },
    [allocateFields],
  )

  const validateAllocateForm = useCallback(
    (values: AllocateLeaveFormValues) => {
      const nextErrors: Partial<Record<keyof AllocateLeaveFormValues, string>> = {}
      for (const field of allocateFields) {
        const err = validateAllocateField(field.name, values[field.name])
        if (err) nextErrors[field.name] = err
      }
      if (!values.leaveTypeId.trim()) {
        nextErrors.leaveTypeId = 'type is required'
      }
      return nextErrors
    },
    [allocateFields, validateAllocateField],
  )

  const handleAllocateFieldChange = useCallback((name: keyof AllocateLeaveFormValues & string, value: string) => {
    setAllocateValues((prev) => ({ ...prev, [name]: value }))
    setAllocateErrors((prev) => {
      if (!prev[name as keyof AllocateLeaveFormValues]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleAllocateFieldBlur = useCallback(
    (name: keyof AllocateLeaveFormValues & string) => {
      setAllocateErrors((prev) => ({
        ...prev,
        [name]: validateAllocateField(name as keyof AllocateLeaveFormValues, allocateValues[name]),
      }))
    },
    [allocateValues, validateAllocateField],
  )

  const openAllocate = () => {
    setAllocateValues(EMPTY_ALLOCATE_LEAVE_FORM)
    setAllocateErrors({})
    setAllocateSubmitError('')
    setAllocateOpen(true)
  }

  const closeAllocate = () => setAllocateOpen(false)

  const handleAllocateSubmit = async () => {
    setAllocateSubmitError('')
    const errors = validateAllocateForm(allocateValues)
    setAllocateErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    if (employeeId === '') return

    try {
      setError('')
      await leaveBalancesApi.adjust({
        employeeId: employeeId as number,
        leaveTypeId: Number(allocateValues.leaveTypeId),
        year,
        kind: allocateValues.kind as LeaveBalanceAdjustmentKind,
        deltaDays: Number(allocateValues.deltaDays),
        comment: allocateValues.comment.trim(),
      })
      closeAllocate()
      setAllocateValues(EMPTY_ALLOCATE_LEAVE_FORM)
      await Promise.all([loadBalances(), loadAdjustments()])
    } catch (e) {
      setAllocateSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  const employeeSelected = employeeId !== ''

  return (
    <PageLayout
      title="Leave admin"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/" variant="outlined">
            Back
          </AppButton>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {LEAVE_TYPES_SECTION_TITLE}
            </Typography>
          </Box>
          <Box sx={{ p: 1 }}>
            <DataGrid<LeaveType>
              columnDefs={leaveTypeColumnDefs}
              fetchRows={fetchLeaveTypeRows}
              getRowId={(row) => String(row.id)}
              defaultPageSize={10}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              height={LEAVE_TYPES_GRID_HEIGHT}
            />
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
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
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{ width: 100 }}
              size="small"
            />
            <AppButton variant="contained" onClick={openAllocate} disabled={!employeeSelected}>
              Allocate Leave
            </AppButton>
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: 'stretch',
            minHeight: 0,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 0,
              borderRadius: 2,
              overflow: 'hidden',
              width: { xs: '100%', md: '55%' },
              flexShrink: { md: 0 },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', flexShrink: 0 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {LEAVE_BALANCE_PANEL_TITLE}
              </Typography>
            </Box>
            <Box sx={{ p: 1, flex: 1, minHeight: 0 }}>
              <DataGrid<LeaveBalance>
                columnDefs={balanceColumnDefs}
                fetchRows={fetchBalanceRows}
                getRowId={(row) => String(row.id)}
                defaultPageSize={10}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                height={SPLIT_PANEL_GRID_HEIGHT}
              />
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 0,
              borderRadius: 2,
              overflow: 'hidden',
              flex: { xs: '1 1 auto', md: '1 1 70%' },
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', flexShrink: 0 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {BALANCE_DETAILS_PANEL_TITLE}
              </Typography>
            </Box>
            <Box sx={{ p: 1, flex: 1, minHeight: 0 }}>
              <DataGrid<LeaveBalanceAdjustment>
                columnDefs={adjustmentColumnDefs}
                fetchRows={fetchAdjustmentRows}
                getRowId={(row) => String(row.id)}
                defaultPageSize={10}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                height={SPLIT_PANEL_GRID_HEIGHT}
              />
            </Box>
          </Paper>
        </Box>
      </Stack>

      <CommonInputForm<AllocateLeaveFormValues>
        open={allocateOpen}
        title={ALLOCATE_LEAVE_DIALOG_TITLE}
        fields={allocateFields}
        values={allocateValues}
        errors={allocateErrors}
        submitError={allocateSubmitError}
        onFieldChange={handleAllocateFieldChange}
        onFieldBlur={handleAllocateFieldBlur}
        onClose={closeAllocate}
        onSubmit={handleAllocateSubmit}
        submitLabel="Save"
      />
    </PageLayout>
  )
}
