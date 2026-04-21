import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  employeesApi,
  holidaysApi,
  leaveBalancesApi,
  leaveReportsApi,
  leaveRequestsApi,
  leaveTypesApi,
} from '../api/client'
import type { Holiday, LeaveBalance, LeaveLedgerAction, LeaveLedgerRow, LeaveRequest, LeaveType } from '../types/hrms'
import type { Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

function iso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
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

function statusDot(status: LeaveRequest['status']) {
  const color =
    status === 'APPROVED' ? 'success.main' : status === 'PENDING' ? 'warning.main' : 'error.main'
  return <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, mx: 'auto' }} />
}

const LEDGER_ACTION_LABELS: Record<LeaveLedgerAction, string> = {
  OPENING: 'Opening balance',
  ALLOCATED: 'Allocated',
  CARRY_FORWARD: 'Carry-forwarded',
  LAPSE: 'Lapsed',
  LEAVE_TAKEN: 'Leave taken',
}

function ledgerActionLabel(action: string): string {
  return LEDGER_ACTION_LABELS[action as LeaveLedgerAction] ?? action
}

export default function LeavePage() {
  const { user, hasRole } = useAuth()
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [tab, setTab] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [summaryPeriod, setSummaryPeriod] = useState<'THIS_FY' | 'LAST_FY' | 'THIS_YEAR' | 'LAST_YEAR' | 'CUSTOM'>(
    'THIS_FY',
  )
  const [summaryFrom, setSummaryFrom] = useState('')
  const [summaryTo, setSummaryTo] = useState('')
  const [summaryItemFilter, setSummaryItemFilter] = useState<'ALL' | 'LEAVE' | 'HOLIDAY'>('ALL')

  const [types, setTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [requestTypeFilter, setRequestTypeFilter] = useState<number | ''>('')
  const [requestStatusFilter, setRequestStatusFilter] = useState<'ALL' | LeaveRequest['status']>('ALL')
  const [requestPeriod, setRequestPeriod] = useState<'THIS_YEAR' | 'LAST_YEAR' | 'CUSTOM' | 'ALL'>('THIS_YEAR')
  const [requestPeriodFrom, setRequestPeriodFrom] = useState('')
  const [requestPeriodTo, setRequestPeriodTo] = useState('')

  const isHr = hasRole('HR') || hasRole('ADMIN')
  const [ledgerEmployees, setLedgerEmployees] = useState<Employee[]>([])
  const [ledgerEmployeeId, setLedgerEmployeeId] = useState<number | ''>('')
  const [ledgerYear, setLedgerYear] = useState(new Date().getFullYear())
  const [ledgerLeaveTypeId, setLedgerLeaveTypeId] = useState<number | ''>('')
  const [ledgerLeaveTypes, setLedgerLeaveTypes] = useState<LeaveType[]>([])
  const [ledgerRows, setLedgerRows] = useState<LeaveLedgerRow[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState('')

  const empId = user?.employeeId ?? null
  const canApply = empId != null || hasRole('HR') || hasRole('ADMIN')
  const hrPick = (hasRole('HR') || hasRole('ADMIN')) && empId == null
  const loadCore = () => {
    setLoading(true)
    const reqs: Promise<unknown>[] = [
      leaveTypesApi.listActive(),
      empId != null ? leaveRequestsApi.list({ employeeId: empId }) : Promise.resolve([] as LeaveRequest[]),
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
    if (!isHr && user?.employeeId != null) setLedgerEmployeeId(user.employeeId)
  }, [isHr, user?.employeeId])

  useEffect(() => {
    if (!isHr) return
    if (tab !== 3) return
    if (ledgerEmployees.length > 0) return
    employeesApi
      .listAll()
      .then(setLedgerEmployees)
      .catch(() => {})
  }, [isHr, tab, ledgerEmployees.length])

  useEffect(() => {
    if (tab !== 3) return
    if (ledgerEmployeeId === '') {
      setLedgerLeaveTypes([])
      return
    }
    let cancelled = false
    leaveReportsApi
      .ledgerFilterLeaveTypes(ledgerEmployeeId as number, ledgerYear)
      .then((list) => {
        if (cancelled) return
        const next = Array.isArray(list) ? list : []
        setLedgerLeaveTypes(next)
        setLedgerLeaveTypeId((cur) => (cur === '' || next.some((t) => t.id === cur) ? cur : ''))
      })
      .catch(() => {
        if (cancelled) return
        const fallback = isHr ? leaveTypesApi.listAll() : leaveTypesApi.listActive()
        fallback
          .then((fb) => {
            if (cancelled) return
            const merged = Array.isArray(fb) ? fb : []
            setLedgerLeaveTypes(merged)
            setLedgerLeaveTypeId((cur) => (cur === '' || merged.some((t) => t.id === cur) ? cur : ''))
          })
          .catch(() => {
            if (!cancelled) setLedgerLeaveTypes([])
          })
      })
    return () => {
      cancelled = true
    }
  }, [tab, ledgerEmployeeId, ledgerYear, isHr])

  useEffect(() => {
    if (tab !== 3) return
    if (ledgerEmployeeId === '') {
      setLedgerRows([])
      return
    }
    setLedgerLoading(true)
    setLedgerError('')
    leaveReportsApi
      .ledger(ledgerEmployeeId as number, ledgerYear, ledgerLeaveTypeId === '' ? null : ledgerLeaveTypeId)
      .then((data) => {
        setLedgerRows(Array.isArray(data) ? data : [])
        setLedgerError('')
      })
      .catch((e) => setLedgerError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLedgerLoading(false))
  }, [tab, ledgerEmployeeId, ledgerYear, ledgerLeaveTypeId])

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

  const filteredRequests = useMemo(() => {
    const parseDate = (s: string | null | undefined) => {
      if (!s) return null
      const str = String(s)
      const d = new Date(str.includes('T') ? str : `${str}T12:00:00`)
      return Number.isFinite(d.getTime()) ? d : null
    }

    const startOfYear = (y: number) => new Date(y, 0, 1, 0, 0, 0, 0)
    const endOfYear = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999)
    const now = new Date()
    const thisYearStart = startOfYear(now.getFullYear())
    const thisYearEnd = endOfYear(now.getFullYear())
    const lastYearStart = startOfYear(now.getFullYear() - 1)
    const lastYearEnd = endOfYear(now.getFullYear() - 1)

    return requests.filter((r) => {
      if (requestTypeFilter !== '' && r.leaveTypeId !== requestTypeFilter) return false
      if (requestStatusFilter !== 'ALL' && r.status !== requestStatusFilter) return false
      const d = parseDate(r.requestedAt) ?? parseDate(r.startDate)
      if (requestPeriod === 'THIS_YEAR') {
        if (d && (d < thisYearStart || d > thisYearEnd)) return false
      } else if (requestPeriod === 'LAST_YEAR') {
        if (d && (d < lastYearStart || d > lastYearEnd)) return false
      } else if (requestPeriod === 'CUSTOM') {
        const from = parseDate(requestPeriodFrom)
        const to = parseDate(requestPeriodTo)
        if (from && d && d < from) return false
        if (to && d && d > to) return false
      }
      return true
    })
  }, [requests, requestTypeFilter, requestStatusFilter, requestPeriod, requestPeriodFrom, requestPeriodTo])

  const bookedByType = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of requests) {
      if (r.status !== 'PENDING') continue
      const cur = m.get(r.leaveTypeId) ?? 0
      m.set(r.leaveTypeId, cur + num(r.totalDays))
    }
    return m
  }, [requests])

  const summaryRange = useMemo(() => {
    const d = new Date()
    const startOfYear = (y: number) => new Date(y, 0, 1, 0, 0, 0, 0)
    const endOfYear = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999)
    const parseDate = (s: string) => {
      if (!s) return null
      const dt = new Date(s.includes('T') ? s : `${s}T12:00:00`)
      return Number.isFinite(dt.getTime()) ? dt : null
    }

    if (summaryPeriod === 'THIS_FY' || summaryPeriod === 'LAST_FY') {
      const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1 // Apr 1
      const base = summaryPeriod === 'THIS_FY' ? fyStartYear : fyStartYear - 1
      return { from: new Date(base, 3, 1), to: new Date(base + 1, 2, 31) }
    }
    if (summaryPeriod === 'THIS_YEAR') {
      return { from: startOfYear(d.getFullYear()), to: endOfYear(d.getFullYear()) }
    }
    if (summaryPeriod === 'LAST_YEAR') {
      return { from: startOfYear(d.getFullYear() - 1), to: endOfYear(d.getFullYear() - 1) }
    }

    // CUSTOM
    const from = parseDate(summaryFrom) ?? new Date(d.getFullYear(), 0, 1)
    const to = parseDate(summaryTo) ?? new Date(d.getFullYear(), 11, 31)
    return { from, to }
  }, [summaryPeriod, summaryFrom, summaryTo])

  const leaveBookedThisYear = useMemo(() => {
    const from = summaryRange.from.getTime()
    const to = summaryRange.to.getTime()
    return requests
      .filter((r) => r.status === 'PENDING')
      .filter((r) => {
        const d = new Date(`${r.startDate}T12:00:00`).getTime()
        return Number.isFinite(d) && d >= from && d <= to
      })
      .reduce((sum, r) => sum + num(r.totalDays), 0)
  }, [requests, summaryRange])

  type TimelineItem = { key: string; date: Date; label: string; kind: 'LEAVE' | 'HOLIDAY' }
  const timeline = useMemo(() => {
    const items: TimelineItem[] = []
    for (const h of holidays) {
      const d = new Date(`${String(h.holidayDate)}T12:00:00`)
      if (!Number.isFinite(d.getTime())) continue
      items.push({ key: `h-${h.id}`, date: d, label: h.name, kind: 'HOLIDAY' })
    }
    for (const r of requests) {
      const d = new Date(`${r.startDate}T12:00:00`)
      if (!Number.isFinite(d.getTime())) continue
      items.push({ key: `r-${r.id}`, date: d, label: r.leaveTypeName, kind: 'LEAVE' })
    }
    items.sort((a, b) => a.date.getTime() - b.date.getTime())
    return items
  }, [holidays, requests])

  const upcomingItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from = summaryRange.from.getTime()
    const to = summaryRange.to.getTime()
    return timeline
      .filter((i) => i.date.getTime() >= from && i.date.getTime() <= to)
      .filter((i) => (summaryItemFilter === 'ALL' ? true : i.kind === summaryItemFilter))
      .filter((i) => i.date.getTime() >= today.getTime())
  }, [timeline, summaryRange, summaryItemFilter])

  const pastItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from = summaryRange.from.getTime()
    const to = summaryRange.to.getTime()
    return timeline
      .filter((i) => i.date.getTime() >= from && i.date.getTime() <= to)
      .filter((i) => (summaryItemFilter === 'ALL' ? true : i.kind === summaryItemFilter))
      .filter((i) => i.date.getTime() < today.getTime())
      .reverse()
  }, [timeline, summaryRange, summaryItemFilter])

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      maxWidth="none"
      // actions={
      //   <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      //     {(hasRole('HR') || hasRole('ADMIN')) && (
      //       <AppButton component={RouterLink} to="/leave/admin" variant="outlined">
      //         Leave admin
      //       </AppButton>
      //     )}
      //   </Box>
      // }
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
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 1, sm: 2 },
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
          }}
        >
          <Tab label="Leave Summary" />
          <Tab label="Leave Balance" />
          <Tab label="Leave Requests" />
          <Tab label="Leave Ledger" />
          <Tab label="Holidays" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {tab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <AppTypography variant="body2" color="text.secondary">
                  Leave booked this year : <strong>{leaveBookedThisYear}</strong> | Absent : <strong>0</strong>
                </AppTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      label="Period"
                      value={summaryPeriod}
                      onChange={(e) => setSummaryPeriod(e.target.value as any)}
                    >
                      <MenuItem value="THIS_FY">This FY</MenuItem>
                      <MenuItem value="LAST_FY">Last FY</MenuItem>
                      <MenuItem value="THIS_YEAR">This Year</MenuItem>
                      <MenuItem value="LAST_YEAR">Last Year</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                    </Select>
                  </FormControl>

                  {summaryPeriod === 'CUSTOM' && (
                    <>
                      <AppTextField
                        label="From"
                        type="date"
                        value={summaryFrom}
                        onChange={(e) => setSummaryFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 160 }}
                      />
                      <AppTextField
                        label="To"
                        type="date"
                        value={summaryTo}
                        onChange={(e) => setSummaryTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 160 }}
                      />
                    </>
                  )}

                  <Paper variant="outlined" sx={{ px: 1.25, py: 0.75, borderRadius: 2 }}>
                    <AppTypography variant="body2" fontWeight={700}>
                      {fmt(summaryRange.from)} - {fmt(summaryRange.to)}
                    </AppTypography>
                  </Paper>
                  <AppButton variant="contained" onClick={() => setCreateOpen(true)} disabled={!canApply}>
                    Apply Leave
                  </AppButton>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {types.map((t) => {
                  const b = balanceByType.get(t.id)
                  const allocated = b ? num(b.allocatedDays) : 0
                  const carried = b ? num(b.carryForwardedDays) : 0
                  const used = b ? num(b.usedDays) : 0
                  const available = allocated + carried - used
                  const booked = bookedByType.get(t.id) ?? 0
                  return (
                    <Paper
                      key={t.id}
                      variant="outlined"
                      sx={{
                        width: { xs: '100%', sm: 190, md: 210 },
                        p: 1.5,
                        borderRadius: 2,
                      }}
                    >
                      <AppTypography variant="caption" color="text.secondary" fontWeight={700}>
                        {t.code} - {t.name}
                      </AppTypography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                          }}
                        >
                          {(t.code || 'LT').slice(0, 2).toUpperCase()}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <AppTypography variant="caption" color="text.secondary">
                          Available
                        </AppTypography>
                        <AppTypography variant="caption" fontWeight={800} color="success.main">
                          {available}
                        </AppTypography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <AppTypography variant="caption" color="text.secondary">
                          Booked
                        </AppTypography>
                        <AppTypography variant="caption" fontWeight={800}>
                          {booked}
                        </AppTypography>
                      </Box>
                    </Paper>
                  )
                })}
              </Box>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', display: 'flex', alignItems: 'center' }}>
                  <AppTypography variant="body2" fontWeight={800} sx={{ minWidth: 260 }}>
                    Upcoming Leaves &amp; Holidays
                  </AppTypography>
                  <FormControl size="small" sx={{ minWidth: 160, ml: 1 }}>
                    <Select
                      value={summaryItemFilter}
                      onChange={(e) => setSummaryItemFilter(e.target.value as any)}
                      displayEmpty
                    >
                      <MenuItem value="ALL">Leaves &amp; Holidays</MenuItem>
                      <MenuItem value="LEAVE">Leave</MenuItem>
                      <MenuItem value="HOLIDAY">Holidays</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ p: 2, maxHeight: 260, overflowY: 'auto' }}>
                  {upcomingItems.length === 0 ? (
                    <AppTypography variant="body2" color="text.secondary">
                      No upcoming items.
                    </AppTypography>
                  ) : (
                    <Stack spacing={1}>
                      {upcomingItems.map((i) => (
                        <Box
                          key={i.key}
                          sx={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: 1,
                            borderColor: 'divider',
                            pb: 1,
                          }}
                        >
                          <AppTypography variant="body2" color="text.secondary" sx={{ flexShrink: 0, minWidth: 170 }}>
                            {i.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}
                          </AppTypography>
                          <AppTypography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                            {i.label}
                          </AppTypography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', display: 'flex', alignItems: 'center' }}>
                  <AppTypography variant="body2" fontWeight={800} sx={{ minWidth: 260 }}>
                    Past Leaves &amp; Holidays
                  </AppTypography>
                  <FormControl size="small" sx={{ minWidth: 160, ml: 1 }}>
                    <Select
                      value={summaryItemFilter}
                      onChange={(e) => setSummaryItemFilter(e.target.value as any)}
                      displayEmpty
                    >
                      <MenuItem value="ALL">Leaves &amp; Holidays</MenuItem>
                      <MenuItem value="LEAVE">Leave</MenuItem>
                      <MenuItem value="HOLIDAY">Holidays</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ p: 2, maxHeight: 260, overflowY: 'auto' }}>
                  {pastItems.length === 0 ? (
                    <AppTypography variant="body2" color="text.secondary">
                      No past items.
                    </AppTypography>
                  ) : (
                    <Stack spacing={1}>
                      {pastItems.map((i) => (
                        <Box
                          key={i.key}
                          sx={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: 1,
                            borderColor: 'divider',
                            pb: 1,
                          }}
                        >
                          <AppTypography variant="body2" color="text.secondary" sx={{ flexShrink: 0, minWidth: 170 }}>
                            {i.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}
                          </AppTypography>
                          <AppTypography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                            {i.label}
                          </AppTypography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>
            </Box>
          )}

          {tab === 1 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  {types.map((t, idx) => {
                    const b = balanceByType.get(t.id)
                    const allocated = b ? num(b.allocatedDays) : 0
                    const carried = b ? num(b.carryForwardedDays) : 0
                    const used = b ? num(b.usedDays) : 0
                    const available = allocated + carried - used
                    const booked = bookedByType.get(t.id) ?? 0
                    return (
                      <Box
                        key={t.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          borderRadius: 2,
                          border: 1,
                          borderColor: 'divider',
                          p: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 1.5,
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                          }}
                        >
                          {`L${idx + 1}`}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <AppTypography variant="body2" fontWeight={800} noWrap>
                            {t.code} - {t.name}
                          </AppTypography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <Box>
                            <AppTypography variant="caption" color="text.secondary">
                              Available
                            </AppTypography>
                            <AppTypography variant="body2" fontWeight={800} color="success.main">
                              {available} days
                            </AppTypography>
                          </Box>
                          <Box>
                            <AppTypography variant="caption" color="text.secondary">
                              Booked
                            </AppTypography>
                            <AppTypography variant="body2" fontWeight={800}>
                              {booked} day
                            </AppTypography>
                          </Box>
                        </Box>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </Paper>
          )}

          {tab === 2 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Leave</InputLabel>
                  <Select
                    label="Leave"
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {types.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      label="Period"
                      value={requestPeriod}
                      onChange={(e) => setRequestPeriod(e.target.value as any)}
                    >
                      <MenuItem value="THIS_YEAR">This Year</MenuItem>
                      <MenuItem value="LAST_YEAR">Last Year</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                      <MenuItem value="ALL">All</MenuItem>
                    </Select>
                  </FormControl>

                  {requestPeriod === 'CUSTOM' && (
                    <>
                      <AppTextField
                        label="From"
                        type="date"
                        value={requestPeriodFrom}
                        onChange={(e) => setRequestPeriodFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 160 }}
                      />
                      <AppTextField
                        label="To"
                        type="date"
                        value={requestPeriodTo}
                        onChange={(e) => setRequestPeriodTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 160 }}
                      />
                    </>
                  )}

                  {requestPeriod !== 'ALL' && requestPeriod !== 'CUSTOM' && (
                    <Chip
                      label={requestPeriod === 'THIS_YEAR' ? 'Period : This Year' : 'Period : Last Year'}
                      size="small"
                      onDelete={() => setRequestPeriod('ALL')}
                      variant="outlined"
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>All Requests</InputLabel>
                    <Select
                      label="All Requests"
                      value={requestStatusFilter}
                      onChange={(e) => setRequestStatusFilter(e.target.value as any)}
                    >
                      <MenuItem value="ALL">All Requests</MenuItem>
                      <MenuItem value="PENDING">Requested</MenuItem>
                      <MenuItem value="APPROVED">Approved</MenuItem>
                      <MenuItem value="REJECTED">Rejected</MenuItem>
                    </Select>
                  </FormControl>

                  <AppButton variant="contained" onClick={() => setCreateOpen(true)} disabled={!canApply}>
                    Add Request
                  </AppButton>

                  <AppButton
                    variant="text"
                    onClick={() => {
                      setRequestTypeFilter('')
                      setRequestStatusFilter('ALL')
                      setRequestPeriod('THIS_YEAR')
                      setRequestPeriodFrom('')
                      setRequestPeriodTo('')
                    }}
                  >
                    Reset
                  </AppButton>
                </Box>
              </Box>

              <TableContainer>
                <Table size="small" sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 80 }}>
                        Status
                      </TableCell>
                      <TableCell>Employee Name</TableCell>
                      <TableCell>Leave type</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Leave period</TableCell>
                      <TableCell>Days/hours taken</TableCell>
                      <TableCell>Date of request</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <AppTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No requests yet.
                          </AppTypography>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRequests.map((r) => {
                      const t = types.find((x) => x.id === r.leaveTypeId)
                      const isPaid = t?.paid ?? true
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell align="center">{statusDot(r.status)}</TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>{r.leaveTypeName}</TableCell>
                          <TableCell>{isPaid ? 'Paid' : 'Unpaid'}</TableCell>
                          <TableCell>
                            {r.startDate} - {r.endDate}
                          </TableCell>
                          <TableCell>{r.totalDays} Day(s)</TableCell>
                          <TableCell>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {tab === 3 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                {isHr ? (
                  <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel>Employee</InputLabel>
                    <Select
                      label="Employee"
                      value={ledgerEmployeeId}
                      onChange={(e) => setLedgerEmployeeId(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <MenuItem value="">—</MenuItem>
                      {ledgerEmployees.map((e) => (
                        <MenuItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTypography variant="body2" color="text.secondary">
                    Showing your leave ledger
                  </AppTypography>
                )}

                <AppTextField
                  label="Year"
                  type="number"
                  size="small"
                  value={ledgerYear}
                  onChange={(e) => setLedgerYear(Number(e.target.value))}
                  sx={{ width: 120 }}
                />

                <FormControl size="small" sx={{ minWidth: 240 }} disabled={ledgerEmployeeId === ''}>
                  <InputLabel>Leave type</InputLabel>
                  <Select
                    label="Leave type"
                    value={ledgerLeaveTypeId}
                    onChange={(e) => setLedgerLeaveTypeId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <MenuItem value="">All types</MenuItem>
                    {ledgerLeaveTypes.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name} ({t.code})
                        {!t.active ? ' — inactive' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ p: 2 }}>
                {ledgerError && (
                  <AppTypography color="error" variant="body2" sx={{ mb: 2 }}>
                    {ledgerError}
                  </AppTypography>
                )}

                {ledgerLoading ? (
                  <LoadingSpinner />
                ) : ledgerEmployeeId === '' ? (
                  <AppTypography color="text.secondary">
                    {isHr
                      ? 'Select an employee to view the report.'
                      : 'Link your account to an employee record to view your leave ledger.'}
                  </AppTypography>
                ) : ledgerRows.length === 0 ? (
                  <AppTypography color="text.secondary">No ledger rows for {ledgerYear}.</AppTypography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Leave type</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell align="right">Days</TableCell>
                        <TableCell align="right">Balance</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ledgerRows.map((r, i) => (
                        <TableRow key={`${r.entryDate}-${r.leaveTypeCode}-${r.action}-${i}`}>
                          <TableCell>{r.entryDate}</TableCell>
                          <TableCell>
                            {r.leaveTypeCode} — {r.leaveTypeName}
                          </TableCell>
                          <TableCell>{ledgerActionLabel(r.action)}</TableCell>
                          <TableCell align="right">{r.days == null || r.days === '' ? '—' : String(r.days)}</TableCell>
                          <TableCell align="right">{String(r.balanceAfter)}</TableCell>
                          <TableCell sx={{ maxWidth: 360 }}>{r.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Paper>
          )}

          {tab === 4 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                <AppTypography variant="subtitle1" fontWeight={800}>
                  Holidays ({year})
                </AppTypography>
              </Box>
              <Box sx={{ p: 2 }}>
                {holidays.length === 0 ? (
                  <AppTypography variant="body2" color="text.secondary">
                    No holidays configured for this year.
                  </AppTypography>
                ) : (
                  <Stack spacing={1}>
                    {holidays.map((h) => (
                      <Box
                        key={h.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          border: 1,
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <AppTypography variant="body2" fontWeight={800} noWrap>
                            {h.name}
                          </AppTypography>
                        </Box>
                        <AppTypography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                          {new Date(String(h.holidayDate) + 'T12:00:00').toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </AppTypography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          )}
        </Box>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add Request</DialogTitle>
        <DialogContent>
          {submitError && (
            <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>
              {submitError}
            </AppTypography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-start', pt: 1 }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
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
              sx={{ width: 180 }}
            />
            <AppTextField
              label="End"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!canApply}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <AppTextField
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canApply}
              sx={{ minWidth: 240, flex: 1 }}
            />
          </Box>
          {hrPick && (
            <AppTypography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              As HR/Admin without an employee profile, create requests via API with <code>employeeId</code>, or use an
              employee login account.
            </AppTypography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <AppButton variant="outlined" onClick={() => setCreateOpen(false)}>
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              onClick={async () => {
                await handleApply()
                setCreateOpen(false)
              }}
              disabled={!canApply}
            >
              Add Request
            </AppButton>
          </Box>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
