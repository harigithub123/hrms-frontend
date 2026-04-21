import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import type { ColDef } from 'ag-grid-community'
import { employeesApi, leaveBalancesApi, leaveRequestsApi, leaveTypesApi } from '../../api/client'
import type { Employee } from '../../types/org'
import type { LeaveBalance, LeaveBalanceAdjustmentKind, LeaveRequest, LeaveType } from '../../types/hrms'
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
import { getLeaveAdminBalanceColumnDefs } from './leaveAdminBalanceColumns'
import { getLeaveAdminLeaveTypeColumnDefs } from './leaveAdminLeaveTypeColumns'
import { clientSlice } from './leaveAdminUtils'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]
const LEAVE_TYPE_PAGE_SIZE_OPTIONS = [7, ...PAGE_SIZE_OPTIONS]
const LEAVE_TYPES_GRID_HEIGHT = 'min(640px, calc(100svh - 300px))'
const SPLIT_PANEL_GRID_HEIGHT = 'min(520px, calc(100svh - 380px))'

function statusChip(status: LeaveRequest['status']) {
  const map = {
    PENDING: 'warning' as const,
    APPROVED: 'success' as const,
    REJECTED: 'error' as const,
  }
  return <Chip size="small" label={status} color={map[status]} variant="outlined" />
}

function inYear(r: LeaveRequest, year: number) {
  const y = `${year}-`
  return Boolean(r.startDate?.startsWith(y) || r.endDate?.startsWith(y))
}

function getLeaveAdminRequestColumnDefs(): ColDef<LeaveRequest>[] {
  return [
    { headerName: 'Leave Type', field: 'leaveTypeName', flex: 1 },
    { headerName: 'Start Date', field: 'startDate', width: 140, maxWidth: 180 },
    { headerName: 'End Date', field: 'endDate', width: 140, maxWidth: 180 },
    { headerName: 'Requested Days', field: 'totalDays', width: 140, maxWidth: 170 },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      maxWidth: 140,
      cellRenderer: (p: { value: LeaveRequest['status'] }) => statusChip(p.value),
    },
    { headerName: 'Comment', field: 'reason', flex: 1.2, tooltipField: 'reason' },
  ]
}

export default function LeaveAdminPage() {
  const [tab, setTab] = useState(0)
  const [types, setTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [selectedOperation, setSelectedOperation] = useState<LeaveRequest | null>(null)
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

  const loadRequests = () => {
    if (employeeId === '') return Promise.resolve()
    return leaveRequestsApi.list({ employeeId: employeeId as number }).then(setRequests)
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
    Promise.all([loadBalances(), loadRequests()]).catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [employeeId, year])

  useEffect(() => {
    setSelectedBalance(null)
    setSelectedOperation(null)
  }, [employeeId, year])

  useEffect(() => {
    if (!selectedBalance) {
      setSelectedOperation(null)
      return
    }

    const opsForType = requests
      .filter((r) => r.leaveTypeId === selectedBalance.leaveTypeId)
      .filter((r) => inYear(r, year))
      .sort((a, b) => {
        const ad = new Date(String(a.startDate)).getTime()
        const bd = new Date(String(b.startDate)).getTime()
        return bd - ad
      })

    setSelectedOperation(opsForType[0] ?? null)
  }, [requests, selectedBalance, year])

  const leaveTypeColumnDefs = useMemo(() => getLeaveAdminLeaveTypeColumnDefs(), [])
  const balanceColumnDefs = useMemo(() => getLeaveAdminBalanceColumnDefs(), [])
  const requestColumnDefs = useMemo(() => getLeaveAdminRequestColumnDefs(), [])

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

  const fetchRequestRows = useCallback(
    async (params: GridQueryParams): Promise<GridQueryResult<LeaveRequest>> => {
      if (employeeId === '') return { rows: [], totalRows: 0 }
      return clientSlice(
        requests.filter((r) => inYear(r, year)),
        params,
      )
    },
    [employeeId, requests, year],
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
      await Promise.all([loadBalances(), loadRequests()])
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
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next as number)}
            variant="scrollable"
            sx={{ px: 1, bgcolor: 'action.hover' }}
          >
            <Tab label="Leave Type details" />
            <Tab label="Employee Leave Details" />
          </Tabs>
        </Paper>

        {tab === 0 && (
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
                defaultPageSize={7}
                pageSizeOptions={LEAVE_TYPE_PAGE_SIZE_OPTIONS}
                height={LEAVE_TYPES_GRID_HEIGHT}
              />
            </Box>
          </Paper>
        )}

        {tab === 1 && (
          <>
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
              <Box
                sx={{
                  width: { xs: '100%', md: '70%' },
                  flexShrink: { md: 0 },
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'stretch' }}>
                  {balances.map((b) => (
                    <Paper
                      key={b.id}
                      variant="outlined"
                      onClick={() => setSelectedBalance(b)}
                      sx={{
                        cursor: 'pointer',
                        width: { xs: '100%', sm: '240px' },
                        borderRadius: 3,
                        p: 1.5,
                        borderColor: selectedBalance?.id === b.id ? 'primary.main' : 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'action.hover',
                            fontWeight: 800,
                          }}
                        >
                          {(b.leaveTypeCode || b.leaveTypeName || 'LT').slice(0, 2).toUpperCase()}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={800} noWrap>
                            {b.leaveTypeName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {b.leaveTypeCode}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Available: {Number(b.allocatedDays ?? 0) + Number(b.carryForwardedDays ?? 0) - Number(b.usedDays ?? 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Carryforward: {b.carryForwardedDays ?? 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total: {Number(b.allocatedDays ?? 0) + Number(b.carryForwardedDays ?? 0)}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 0,
                    borderRadius: 2,
                    overflow: 'hidden',
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
                      onRowClicked={(row) => setSelectedBalance(row)}
                    />
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', flexShrink: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Leave requests
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <DataGrid<LeaveRequest>
                      columnDefs={requestColumnDefs}
                      fetchRows={fetchRequestRows}
                      getRowId={(row) => String(row.id)}
                      defaultPageSize={10}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      height="min(420px, calc(100svh - 520px))"
                      onRowClicked={(row) => setSelectedOperation(row)}
                    />
                  </Box>
                </Paper>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  width: { xs: '100%', md: '30%' },
                  minWidth: 0,
                  borderRadius: 2,
                  p: 2,
                  maxHeight: { xs: 'auto', md: 'calc(100svh - 380px)' },
                  overflowY: { xs: 'visible', md: 'auto' },
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  Leave details
                </Typography>

                {!selectedBalance ? (
                  <Typography variant="body2" color="text.secondary">
                    Click a leave balance row to see details here.
                  </Typography>
                ) : !selectedOperation ? (
                  <Stack spacing={0.75}>
                    <Typography variant="body2">
                      <strong>Leave type:</strong> {selectedBalance.leaveTypeName || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click a leave request row (taken/added) to see one operation here.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.75}>
                    <Typography variant="body2">
                      <strong>Operation:</strong> Leave request
                    </Typography>
                    <Typography variant="body2">
                      <strong>No of days:</strong> {selectedOperation.totalDays ?? '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Start date:</strong> {selectedOperation.startDate || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>End date:</strong> {selectedOperation.endDate || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Leave type:</strong> {selectedOperation.leaveTypeName || selectedBalance.leaveTypeName || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {selectedOperation.status || '—'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Reason:</strong> {selectedOperation.reason?.trim() ? selectedOperation.reason : '—'}
                    </Typography>
                  </Stack>
                )}
              </Paper>
            </Box>
          </>
        )}
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
