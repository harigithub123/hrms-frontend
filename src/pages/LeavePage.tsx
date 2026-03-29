import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
} from '@mui/material'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  holidaysApi,
  leaveBalancesApi,
  leaveRequestsApi,
  leaveTypesApi,
  meApi,
} from '../api/client'
import type {
  Holiday,
  LeaveBalance,
  LeaveCalendarRange,
  LeaveRequest,
  LeaveType,
} from '../types/hrms'
import type { Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

function monthBounds(year: number, month: number) {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { from: iso(from), to: iso(to) }
}

function num(s: string) {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function statusChip(status: LeaveRequest['status']) {
  const map = {
    PENDING: 'warning' as const,
    APPROVED: 'success' as const,
    REJECTED: 'error' as const,
  }
  return <Chip size="small" label={status} color={map[status]} variant="outlined" />
}

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  if (value !== index) return null
  return <Box sx={{ pt: 2.5 }}>{children}</Box>
}

export default function LeavePage() {
  const { user, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mainTab = location.pathname === '/leave/team' ? 1 : 0
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [teamFilterEmployeeId, setTeamFilterEmployeeId] = useState<number | ''>('')

  const [types, setTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [ranges, setRanges] = useState<LeaveCalendarRange[]>([])
  const [teamEmployees, setTeamEmployees] = useState<Employee[]>([])

  const [loading, setLoading] = useState(true)
  const [calLoading, setCalLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const empId = user?.employeeId ?? null
  const canApply = empId != null || hasRole('HR') || hasRole('ADMIN')
  const hrPick = (hasRole('HR') || hasRole('ADMIN')) && empId == null
  const showBalances = empId != null
  const hasReportees = (user?.directReportCount ?? 0) > 0
  const showTeamLeave = hasRole('ADMIN') || hasRole('HR') || hasReportees

  const { from, to } = monthBounds(calYear, calMonth)

  const loadCore = () => {
    setLoading(true)
    const reqs: Promise<unknown>[] = [
      leaveTypesApi.listActive(),
      leaveRequestsApi.list(empId != null ? { employeeId: empId } : {}),
      holidaysApi.list(year),
    ]
    if (empId != null) {
      reqs.push(leaveBalancesApi.list(empId, year))
    }
    Promise.all(reqs)
      .then((results) => {
        const t = results[0] as LeaveType[]
        const r = results[1] as LeaveRequest[]
        const h = results[2] as Holiday[]
        setTypes(t)
        setRequests(r)
        setHolidays(h)
        if (empId != null) {
          setBalances(results[3] as LeaveBalance[])
        } else {
          setBalances([])
        }
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCore()
  }, [user?.employeeId, year])

  useEffect(() => {
    if (!showTeamLeave) {
      setTeamEmployees([])
      return
    }
    meApi
      .directReports()
      .then(setTeamEmployees)
      .catch(() => {})
  }, [showTeamLeave, user?.employeeId])

  useEffect(() => {
    if (teamFilterEmployeeId === '') return
    if (!teamEmployees.some((e) => e.id === teamFilterEmployeeId)) {
      setTeamFilterEmployeeId('')
    }
  }, [teamEmployees, teamFilterEmployeeId])

  useEffect(() => {
    if (!showTeamLeave) {
      setRanges([])
      return
    }
    setCalLoading(true)
    leaveRequestsApi
      .calendar(from, to, teamFilterEmployeeId === '' ? null : teamFilterEmployeeId)
      .then((data) => {
        setRanges(data)
      })
      .catch(() => setRanges([]))
      .finally(() => setCalLoading(false))
  }, [showTeamLeave, from, to, teamFilterEmployeeId])

  const handleApply = async () => {
    setSubmitError('')
    if (leaveTypeId === '' || !startDate || !endDate) {
      setSubmitError('Select leave type and dates')
      return
    }
    try {
      await leaveRequestsApi.create({
        leaveTypeId: leaveTypeId as number,
        startDate,
        endDate,
        reason: reason || undefined,
      })
      setReason('')
      loadCore()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const balanceByType = useMemo(() => {
    const m = new Map<number, LeaveBalance>()
    balances.forEach((b) => m.set(b.leaveTypeId, b))
    return m
  }, [balances])

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {((hasRole('HR') || hasRole('ADMIN')) || empId != null) && (
            <AppButton component={RouterLink} to="/leave/report" variant="outlined">
              Leave ledger
            </AppButton>
          )}
          {(hasRole('HR') || hasRole('ADMIN')) && (
            <AppButton component={RouterLink} to="/leave/admin" variant="outlined">
              Leave admin
            </AppButton>
          )}
        </Box>
      }
    >
      {!canApply && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your account is not tied to an employee record yet. Ask HR to add you as an employee so you can apply for leave.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => navigate(v === 0 ? '/leave' : '/leave/team')}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 1, sm: 2 },
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
          }}
        >
          <Tab label="My leave details" id="leave-subtab-0" />
          <Tab label="Team leave" id="leave-subtab-1" />
        </Tabs>
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          <TabPanel value={mainTab} index={0}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 2.5,
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Year</InputLabel>
                      <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                        {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                          <MenuItem key={y} value={y}>
                            {y}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <AppTypography variant="body2" color="text.secondary">
                      Leave balances and company holidays use the selected year.
                    </AppTypography>
                  </Box>

                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
                      Apply for leave
                    </AppTypography>
                    {submitError && (
                      <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>
                        {submitError}
                      </AppTypography>
                    )}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-start' }}>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Leave type</InputLabel>
                        <Select
                          label="Leave type"
                          value={leaveTypeId}
                          onChange={(e) => setLeaveTypeId(e.target.value === '' ? '' : Number(e.target.value))}
                          disabled={!canApply}
                        >
                          {types.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name} ({t.code})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <AppTextField
                        label="Start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={!canApply}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160 }}
                      />
                      <AppTextField
                        label="End"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={!canApply}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160 }}
                      />
                      <AppTextField
                        label="Reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={!canApply}
                        sx={{ minWidth: 220, flex: 1 }}
                      />
                      <AppButton variant="contained" onClick={handleApply} disabled={!canApply}>
                        Submit request
                      </AppButton>
                    </Box>
                    {hrPick && (
                      <AppTypography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        As HR/Admin without an employee profile, create requests via API with <code>employeeId</code>, or
                        use an employee login account.
                      </AppTypography>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                      <AppTypography variant="subtitle1" fontWeight={700}>
                        My leave requests
                      </AppTypography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>From</TableCell>
                            <TableCell>To</TableCell>
                            <TableCell align="right">Days</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {requests.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5}>
                                <AppTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                  No requests yet.
                                </AppTypography>
                              </TableCell>
                            </TableRow>
                          )}
                          {requests.map((r) => (
                            <TableRow key={r.id} hover>
                              <TableCell>{r.leaveTypeName}</TableCell>
                              <TableCell>{r.startDate}</TableCell>
                              <TableCell>{r.endDate}</TableCell>
                              <TableCell align="right">{r.totalDays}</TableCell>
                              <TableCell>{statusChip(r.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Stack>
              </Box>

              <Stack
                spacing={2}
                sx={{
                  width: { xs: '100%', lg: 320 },
                  flexShrink: 0,
                  position: { lg: 'sticky' },
                  top: { lg: 16 },
                  alignSelf: { lg: 'flex-start' },
                }}
              >
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, width: '100%' }}>
                  <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
                    Leave details
                  </AppTypography>
                  <Divider sx={{ mb: 1.5 }} />
                  {!showBalances ? (
                    <AppTypography variant="body2" color="text.secondary">
                      Link your account to an employee to see leave types with allocation, carry-forward, used, and balance per type.
                    </AppTypography>
                  ) : types.length === 0 ? (
                    <AppTypography variant="body2" color="text.secondary">
                      No active leave types.
                    </AppTypography>
                  ) : (
                    <Stack spacing={1.25} sx={{ maxHeight: { xs: 'none', lg: '38vh' }, overflowY: 'auto' }}>
                      {types.map((t) => {
                        const b = balanceByType.get(t.id)
                        const allocated = b ? num(b.allocatedDays) : null
                        const carried = b ? num(b.carryForwardedDays) : null
                        const used = b ? num(b.usedDays) : null
                        const remaining =
                          allocated != null && carried != null && used != null
                            ? allocated + carried - used
                            : null
                        return (
                          <Box
                            key={t.id}
                            sx={{
                              py: 1,
                              px: 1.25,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                            }}
                          >
                            <AppTypography variant="body2" fontWeight={600}>
                              {t.name} (Policy {num(t.daysPerYear)} days/yr)
                            </AppTypography>
                            <AppTypography variant="caption" color="text.secondary" display="block">
                              {t.paid ? '' : ' · Unpaid'}
                            </AppTypography>
                            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                              <Box>
                                <AppTypography variant="caption" color="text.secondary" display="block">
                                  Allocated
                                </AppTypography>
                                <AppTypography variant="body2" fontWeight={600}>
                                  {allocated != null ? allocated : '—'}
                                </AppTypography>
                              </Box>
                              <Box>
                                <AppTypography variant="caption" color="text.secondary" display="block">
                                  Carry fwd
                                </AppTypography>
                                <AppTypography variant="body2" fontWeight={600}>
                                  {carried != null ? carried : '—'}
                                </AppTypography>
                              </Box>
                              <Box>
                                <AppTypography variant="caption" color="text.secondary" display="block">
                                  Used
                                </AppTypography>
                                <AppTypography variant="body2" fontWeight={600}>
                                  {used != null ? used : '—'}
                                </AppTypography>
                              </Box>
                              <Box>
                                <AppTypography variant="caption" color="text.secondary" display="block">
                                  Balance
                                </AppTypography>
                                <AppTypography
                                  variant="body2"
                                  fontWeight={600}
                                  color={remaining != null && remaining <= 0 ? 'error.main' : 'text.primary'}
                                >
                                  {remaining != null ? remaining : '—'}
                                </AppTypography>
                              </Box>
                            </Stack>
                            {!b && (
                              <AppTypography variant="caption" color="warning.main" sx={{ mt: 0.75, display: 'block' }}>
                                No allocation for {year} — ask HR (Leave admin).
                              </AppTypography>
                            )}
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, width: '100%' }}>
                  <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
                    Company holidays ({year})
                  </AppTypography>
                  <Divider sx={{ mb: 1.5 }} />
                  {holidays.length === 0 ? (
                    <AppTypography variant="body2" color="text.secondary">
                      No holidays configured for this year.
                    </AppTypography>
                  ) : (
                    <Stack spacing={1.25} sx={{ maxHeight: { xs: 'none', lg: '38vh' }, overflowY: 'auto' }}>
                      {holidays.map((h) => (
                        <Box
                          key={h.id}
                          sx={{
                            py: 1,
                            px: 1.25,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                          }}
                        >
                          <AppTypography variant="body2" fontWeight={600}>
                            {h.name}
                          </AppTypography>
                          <AppTypography variant="caption" color="text.secondary">
                            {new Date(h.holidayDate + 'T12:00:00').toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </AppTypography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Stack>
            </Box>
          </TabPanel>

          <TabPanel value={mainTab} index={1}>
            {!showTeamLeave ? (
              <Alert severity="info">
                Team leave is visible to HR, administrators, and people managers with direct reports.
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
                  Team leave
                </AppTypography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                  <AppTextField
                    label="Year"
                    type="number"
                    value={calYear}
                    onChange={(e) => setCalYear(Number(e.target.value))}
                    sx={{ width: 100 }}
                    size="small"
                  />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Month</InputLabel>
                    <Select label="Month" value={calMonth} onChange={(e) => setCalMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      label="Employee"
                      value={teamFilterEmployeeId}
                      onChange={(e) => setTeamFilterEmployeeId(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <MenuItem value="">All</MenuItem>
                      {teamEmployees.map((e) => (
                        <MenuItem key={e.id} value={e.id}>
                          {`${e.firstName} ${e.lastName}`.trim() || e.employeeCode || `#${e.id}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <AppButton
                    variant="outlined"
                    onClick={() => {
                      const d = new Date()
                      setCalYear(d.getFullYear())
                      setCalMonth(d.getMonth() + 1)
                    }}
                  >
                    This month
                  </AppButton>
                </Box>
                {calLoading ? (
                  <AppTypography variant="body2" color="text.secondary">
                    Loading…
                  </AppTypography>
                ) : (
                  <>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Employee</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>From</TableCell>
                            <TableCell>To</TableCell>
                            <TableCell align="right">Days</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ranges.map((r) => (
                            <TableRow key={r.requestId} hover>
                              <TableCell>{r.employeeName}</TableCell>
                              <TableCell>{r.leaveTypeName}</TableCell>
                              <TableCell>{r.startDate}</TableCell>
                              <TableCell>{r.endDate}</TableCell>
                              <TableCell align="right">{r.totalDays}</TableCell>
                              <TableCell>{statusChip(r.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {ranges.length === 0 && (
                      <AppTypography color="text.secondary" sx={{ py: 1 }}>
                        No leave in this period.
                      </AppTypography>
                    )}
                  </>
                )}
              </Paper>
            )}
          </TabPanel>
        </Box>
      </Paper>
    </PageLayout>
  )
}
