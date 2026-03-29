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
import { employeesApi, leaveBalancesApi, leaveTypesApi } from '../api/client'
import type { Employee } from '../types/org'
import type { LeaveBalance, LeaveBalanceAdjustment, LeaveType } from '../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

function num(v: string | undefined | null): number {
  const n = parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

export default function LeaveAdminPage() {
  const [types, setTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [adjustments, setAdjustments] = useState<LeaveBalanceAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [adjOpen, setAdjOpen] = useState(false)
  const [adjTypeId, setAdjTypeId] = useState<number | ''>('')
  const [adjKind, setAdjKind] = useState<'ALLOCATION' | 'CARRY_FORWARD' | 'LAPSE'>('ALLOCATION')
  const [adjDelta, setAdjDelta] = useState('0')
  const [adjComment, setAdjComment] = useState('')

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

  const saveAdjustment = async () => {
    if (employeeId === '' || adjTypeId === '') return
    const delta = Number(adjDelta)
    if (!Number.isFinite(delta) || delta === 0) {
      setError('Enter a non-zero number of days')
      return
    }
    const comment = adjComment.trim()
    if (!comment) {
      setError('Comment is required')
      return
    }
    try {
      setError('')
      await leaveBalancesApi.adjust({
        employeeId: employeeId as number,
        leaveTypeId: adjTypeId as number,
        year,
        kind: adjKind,
        deltaDays: delta,
        comment,
      })
      setAdjOpen(false)
      setAdjComment('')
      setAdjDelta('0')
      await Promise.all([loadBalances(), loadAdjustments()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
        Leave types
      </AppTypography>
      <AppTypography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Configure carry-forward limits on each type (max per year into the next year, and max total carried balance).
        Use HR → Leave types for full edit/delete.
      </AppTypography>
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Days/year</TableCell>
            <TableCell>Carry FWD</TableCell>
            <TableCell>Max / yr</TableCell>
            <TableCell>Max cap</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {types.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.code}</TableCell>
              <TableCell>{t.name}</TableCell>
              <TableCell>{t.daysPerYear}</TableCell>
              <TableCell>{t.carryForward ? 'Yes' : 'No'}</TableCell>
              <TableCell>
                {t.carryForward && t.maxCarryForwardPerYear != null && t.maxCarryForwardPerYear !== ''
                  ? t.maxCarryForwardPerYear
                  : '—'}
              </TableCell>
              <TableCell>
                {t.carryForward && t.maxCarryForward != null && t.maxCarryForward !== ''
                  ? t.maxCarryForward
                  : '—'}
              </TableCell>
              <TableCell>{t.active ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
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
        <AppButton variant="contained" onClick={() => setAdjOpen(true)} disabled={employeeId === ''}>
          Allocate Leave
        </AppButton>
      </Box>

      <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
        Balances
      </AppTypography>
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Allocated</TableCell>
            <TableCell>Carry forwarded</TableCell>
            <TableCell>Used</TableCell>
            <TableCell>Available</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employeeId === '' ? (
            <TableRow>
              <TableCell colSpan={5}>
                <AppTypography variant="body2" color="text.secondary">
                  Select an employee to view balances.
                </AppTypography>
              </TableCell>
            </TableRow>
          ) : (
            balances.map((b) => {
              const pool = num(b.allocatedDays) + num(b.carryForwardedDays)
              const avail = pool - num(b.usedDays)
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.leaveTypeCode} — {b.leaveTypeName}
                  </TableCell>
                  <TableCell>{b.allocatedDays}</TableCell>
                  <TableCell>{b.carryForwardedDays ?? '0'}</TableCell>
                  <TableCell>{b.usedDays}</TableCell>
                  <TableCell>{avail}</TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
        Balance history
      </AppTypography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Kind</TableCell>
            <TableCell>Δ days</TableCell>
            <TableCell>Comment</TableCell>
            <TableCell>By</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employeeId === '' ? (
            <TableRow>
              <TableCell colSpan={6}>
                <AppTypography variant="body2" color="text.secondary">
                  Select an employee to view adjustment history.
                </AppTypography>
              </TableCell>
            </TableRow>
          ) : adjustments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <AppTypography variant="body2" color="text.secondary">
                  No adjustments for {year}.
                </AppTypography>
              </TableCell>
            </TableRow>
          ) : (
            adjustments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {a.leaveTypeCode} — {a.leaveTypeName}
                </TableCell>
                <TableCell>
                  {a.kind === 'CARRY_FORWARD' ? 'Carry forward' : a.kind === 'LAPSE' ? 'Lapse' : 'Allocation'}
                </TableCell>
                <TableCell>{a.deltaDays}</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>{a.comment}</TableCell>
                <TableCell>{a.createdByUsername ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={adjOpen} onClose={() => setAdjOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Allocate Leave</DialogTitle>
        <DialogContent>
          <AppTypography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Use <strong>Allocation</strong> for grants or corrections to annual allocation. Use{' '}
            <strong>Carry forward</strong> to record balance brought from a prior period (subject to leave-type limits).
            Each change is stored with your comment for audit history.
          </AppTypography>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Leave type</InputLabel>
            <Select
              label="Leave type"
              value={adjTypeId}
              onChange={(e) => setAdjTypeId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Kind</InputLabel>
            <Select
              label="Kind"
              value={adjKind}
              onChange={(e) => setAdjKind(e.target.value as 'ALLOCATION' | 'CARRY_FORWARD' | 'LAPSE')}
            >
              <MenuItem value="ALLOCATION">Allocation (annual grant)</MenuItem>
              <MenuItem value="CARRY_FORWARD">Carry forward</MenuItem>
              <MenuItem value="LAPSE">Lapse (unused leave expired)</MenuItem>
            </Select>
          </FormControl>
          <AppTextField
            label="Days to add (use negative to reduce)"
            value={adjDelta}
            onChange={(e) => setAdjDelta(e.target.value)}
            margin="dense"
            fullWidth
            type="number"
            inputProps={{ step: 0.5 }}
          />
          <AppTextField
            label="Comment (required)"
            value={adjComment}
            onChange={(e) => setAdjComment(e.target.value)}
            margin="dense"
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={() => setAdjOpen(false)}>Cancel</AppButton>
          <AppButton variant="contained" onClick={saveAdjustment}>
            Save
          </AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
