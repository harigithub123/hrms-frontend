import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
import type { LeaveBalance, LeaveType } from '../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

export default function LeaveAdminPage() {
  const [types, setTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [typeOpen, setTypeOpen] = useState(false)
  const [tName, setTName] = useState('')
  const [tCode, setTCode] = useState('')
  const [tDays, setTDays] = useState('18')
  const [tCarry, setTCarry] = useState(false)
  const [tPaid, setTPaid] = useState(true)
  const [tActive, setTActive] = useState(true)

  const [balOpen, setBalOpen] = useState(false)
  const [balTypeId, setBalTypeId] = useState<number | ''>('')
  const [balAllocated, setBalAllocated] = useState('0')

  const loadTypes = () => leaveTypesApi.listAll().then(setTypes).catch(() => {})
  const loadEmployees = () => employeesApi.listAll().then(setEmployees).catch(() => {})

  const loadBalances = () => {
    if (employeeId === '') return Promise.resolve()
    return leaveBalancesApi.list(employeeId as number, year).then(setBalances)
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
    loadBalances().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [employeeId, year])

  const saveType = async () => {
    try {
      await leaveTypesApi.create({
        name: tName,
        code: tCode,
        daysPerYear: Number(tDays),
        carryForward: tCarry,
        paid: tPaid,
        active: tActive,
      })
      setTypeOpen(false)
      setTName('')
      setTCode('')
      loadTypes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const saveBalance = async () => {
    if (employeeId === '' || balTypeId === '') return
    try {
      await leaveBalancesApi.upsert({
        employeeId: employeeId as number,
        leaveTypeId: balTypeId as number,
        year,
        allocatedDays: Number(balAllocated),
      })
      setBalOpen(false)
      await loadBalances()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Leave admin"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton variant="outlined" onClick={() => setTypeOpen(true)}>
            Add leave type
          </AppButton>
          <AppButton variant="contained" onClick={() => setBalOpen(true)} disabled={employeeId === ''}>
            Set balance
          </AppButton>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
        Leave types
      </AppTypography>
      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Days/year</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {types.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.code}</TableCell>
              <TableCell>{t.name}</TableCell>
              <TableCell>{t.daysPerYear}</TableCell>
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
        />
      </Box>

      <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
        Balances
      </AppTypography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Allocated</TableCell>
            <TableCell>Used</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {balances.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                {b.leaveTypeCode} — {b.leaveTypeName}
              </TableCell>
              <TableCell>{b.allocatedDays}</TableCell>
              <TableCell>{b.usedDays}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={typeOpen} onClose={() => setTypeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add leave type</DialogTitle>
        <DialogContent>
          <AppTextField label="Name" value={tName} onChange={(e) => setTName(e.target.value)} margin="dense" />
          <AppTextField label="Code" value={tCode} onChange={(e) => setTCode(e.target.value)} margin="dense" />
          <AppTextField label="Days per year" value={tDays} onChange={(e) => setTDays(e.target.value)} margin="dense" />
          <FormControlLabel control={<Checkbox checked={tCarry} onChange={(e) => setTCarry(e.target.checked)} />} label="Carry forward" />
          <FormControlLabel control={<Checkbox checked={tPaid} onChange={(e) => setTPaid(e.target.checked)} />} label="Paid" />
          <FormControlLabel control={<Checkbox checked={tActive} onChange={(e) => setTActive(e.target.checked)} />} label="Active" />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={() => setTypeOpen(false)}>Cancel</AppButton>
          <AppButton variant="contained" onClick={saveType}>
            Save
          </AppButton>
        </DialogActions>
      </Dialog>

      <Dialog open={balOpen} onClose={() => setBalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Allocate balance</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Leave type</InputLabel>
            <Select
              label="Leave type"
              value={balTypeId}
              onChange={(e) => setBalTypeId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.code}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <AppTextField
            label="Allocated days"
            value={balAllocated}
            onChange={(e) => setBalAllocated(e.target.value)}
            margin="dense"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={() => setBalOpen(false)}>Cancel</AppButton>
          <AppButton variant="contained" onClick={saveBalance}>
            Save
          </AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
