import { useEffect, useState } from 'react'
import { Box, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { employeesApi, leaveReportsApi, leaveTypesApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import type { Employee } from '../types/org'
import type { LeaveLedgerAction, LeaveLedgerRow, LeaveType } from '../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

const ACTION_LABELS: Record<LeaveLedgerAction, string> = {
  OPENING: 'Opening balance',
  ALLOCATED: 'Allocated',
  CARRY_FORWARD: 'Carry-forwarded',
  LAPSE: 'Lapsed',
  LEAVE_TAKEN: 'Leave taken',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action as LeaveLedgerAction] ?? action
}

function fmtDays(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  return String(v)
}

function fmtBal(v: string | number): string {
  return String(v)
}

export default function LeaveReportPage() {
  const { user, hasRole } = useAuth()
  const isHr = hasRole('HR') || hasRole('ADMIN')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('')
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [rows, setRows] = useState<LeaveLedgerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (employeeId === '') {
      setLeaveTypes([])
      return
    }
    let cancelled = false
    leaveReportsApi
      .ledgerFilterLeaveTypes(employeeId as number, year)
      .then((types) => {
        if (cancelled) return
        const list = Array.isArray(types) ? types : []
        if (list.length === 0) {
          const fallback = isHr ? leaveTypesApi.listAll() : leaveTypesApi.listActive()
          return fallback.then((fb) => {
            if (cancelled) return
            const merged = Array.isArray(fb) ? fb : []
            setLeaveTypes(merged)
            setLeaveTypeId((current) => {
              if (current === '') return ''
              return merged.some((t) => t.id === current) ? current : ''
            })
          })
        }
        setLeaveTypes(list)
        setLeaveTypeId((current) => {
          if (current === '') return ''
          return list.some((t) => t.id === current) ? current : ''
        })
      })
      .catch(() => {
        if (cancelled) return
        const fallback = isHr ? leaveTypesApi.listAll() : leaveTypesApi.listActive()
        fallback
          .then((fb) => {
            if (cancelled) return
            const merged = Array.isArray(fb) ? fb : []
            setLeaveTypes(merged)
            setLeaveTypeId((current) => {
              if (current === '') return ''
              return merged.some((t) => t.id === current) ? current : ''
            })
          })
          .catch(() => {
            if (!cancelled) setLeaveTypes([])
          })
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, year, isHr])

  useEffect(() => {
    if (!isHr) return
    employeesApi
      .listAll()
      .then(setEmployees)
      .catch(() => {})
  }, [isHr])

  useEffect(() => {
    if (!isHr && user?.employeeId != null) {
      setEmployeeId(user.employeeId)
    }
  }, [isHr, user?.employeeId])

  useEffect(() => {
    if (employeeId === '') {
      setRows([])
      return
    }
    setLoading(true)
    setError('')
    leaveReportsApi
      .ledger(employeeId as number, year, leaveTypeId === '' ? null : leaveTypeId)
      .then((data) => {
        setRows(data)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [employeeId, year, leaveTypeId])

  return (
    <PageLayout
      actions={
        <AppButton component={RouterLink} to="/leave" variant="outlined">
          Back to leave
        </AppButton>
      }
    >
      <AppTypography variant="h6" fontWeight={700} gutterBottom>
        Leave ledger report
      </AppTypography>
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Chronological view of allocations, carry-forward, lapses, and approved leave. Balance is available days
        (allocated + carry-forward − used) after each line. Opening balance is derived from the current year-end
        position and recorded movements.
      </AppTypography>

      {error && (
        <AppTypography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </AppTypography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        {isHr ? (
          <FormControl size="small" sx={{ minWidth: 240 }}>
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
        ) : (
          <AppTypography variant="body2" color="text.secondary">
            Showing your leave ledger
          </AppTypography>
        )}
        <AppTextField
          label="Year"
          type="number"
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ width: 120 }}
        />
        <FormControl size="small" sx={{ minWidth: 240 }} disabled={employeeId === ''}>
          <InputLabel>Leave type</InputLabel>
          <Select
            label="Leave type"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <MenuItem value="">All types</MenuItem>
            {leaveTypes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name} ({t.code})
                {!t.active ? ' — inactive' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : employeeId === '' ? (
        <AppTypography color="text.secondary">
          {isHr ? 'Select an employee to view the report.' : 'Link your account to an employee record to view your leave ledger.'}
        </AppTypography>
      ) : rows.length === 0 ? (
        <AppTypography color="text.secondary">No ledger rows for {year}.</AppTypography>
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
            {rows.map((r, i) => (
              <TableRow key={`${r.entryDate}-${r.leaveTypeCode}-${r.action}-${i}`}>
                <TableCell>{r.entryDate}</TableCell>
                <TableCell>
                  {r.leaveTypeCode} — {r.leaveTypeName}
                </TableCell>
                <TableCell>{actionLabel(r.action)}</TableCell>
                <TableCell align="right">{fmtDays(r.days)}</TableCell>
                <TableCell align="right">{fmtBal(r.balanceAfter)}</TableCell>
                <TableCell sx={{ maxWidth: 360 }}>{r.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageLayout>
  )
}
