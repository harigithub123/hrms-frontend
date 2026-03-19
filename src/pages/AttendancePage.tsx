import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { attendanceApi, employeesApi } from '../api/client'
import type { Employee } from '../types/org'
import type { AttendanceRecord, AttendanceStatus } from '../types/hrms'
import { AppButton, AppTextField, AppTypography, PageLayout } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

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
  const [rows, setRows] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [open, setOpen] = useState(false)
  const [workDate, setWorkDate] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [status, setStatus] = useState<AttendanceStatus>('PRESENT')
  const [notes, setNotes] = useState('')

  const loadEmployees = () => employeesApi.listAll().then(setEmployees)

  const loadAttendance = () => {
    if (employeeId === '') return Promise.resolve()
    setLoading(true)
    return attendanceApi
      .list(employeeId as number, from, to)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadEmployees().catch(() => {})
  }, [])

  useEffect(() => {
    if (employeeId === '') {
      setRows([])
      return
    }
    loadAttendance()
  }, [employeeId, from, to])

  const save = async () => {
    if (employeeId === '' || !workDate) return
    try {
      await attendanceApi.upsert({
        employeeId: employeeId as number,
        workDate,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        status,
        notes: notes || null,
      })
      setOpen(false)
      await loadAttendance()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <PageLayout
      title="Attendance"
      actions={
        isHr ? (
          <AppButton variant="contained" disabled={employeeId === ''} onClick={() => setOpen(true)}>
            Add / edit day
          </AppButton>
        ) : null
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
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
        <AppTextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <AppTextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>

      {!isHr && (
        <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Recording attendance is restricted to HR/Admin. You can view your own or your team’s attendance when your user is
          linked to an employee.
        </AppTypography>
      )}

      {loading && <AppTypography variant="body2">Loading…</AppTypography>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Check in</TableCell>
            <TableCell>Check out</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.workDate}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>{r.checkIn ?? '—'}</TableCell>
              <TableCell>{r.checkOut ?? '—'}</TableCell>
              <TableCell>{r.notes ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Attendance entry</DialogTitle>
        <DialogContent>
          <AppTextField
            label="Work date"
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            margin="dense"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <AppTextField label="Check in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} margin="dense" fullWidth InputLabelProps={{ shrink: true }} />
          <AppTextField label="Check out" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} margin="dense" fullWidth InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
              {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'REMOTE'] as const).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <AppTextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} margin="dense" fullWidth />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={() => setOpen(false)}>Cancel</AppButton>
          <AppButton variant="contained" onClick={save}>
            Save
          </AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
