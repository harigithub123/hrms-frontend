import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { compensationApi, employeesApi, payrollApi } from '../api/client'
import type { EmployeeCompensation, SalaryComponent } from '../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'
import type { Employee } from '../types/org'

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function CompensationPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empId, setEmpId] = useState<number | ''>('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [rows, setRows] = useState<EmployeeCompensation[]>([])
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [effFrom, setEffFrom] = useState('')
  const [annualCtc, setAnnualCtc] = useState('')
  const [lines, setLines] = useState<{ componentId: number; amount: string }[]>([{ componentId: 0, amount: '' }])
  const [openLines, setOpenLines] = useState(false)
  const [selected, setSelected] = useState<EmployeeCompensation | null>(null)

  useEffect(() => {
    Promise.all([employeesApi.listAll(), payrollApi.componentsAll()])
      .then(([e, c]) => {
        setEmployees(e)
        setComponents(c.filter((x) => x.active && x.kind === 'EARNING'))
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  const employeeLabel = useMemo(() => {
    if (empId === '') return '—'
    const e = employees.find((x) => x.id === empId)
    return e ? `${e.firstName} ${e.lastName}`.trim() : String(empId)
  }, [empId, employees])

  const addLine = () => setLines((l) => [...l, { componentId: 0, amount: '' }])

  const search = async () => {
    if (empId === '' || !effectiveDate) {
      setError('Select employee and effective date')
      return
    }
    try {
      const res = await compensationApi.search({ employeeId: empId as number, effectiveDate })
      setRows(res)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setRows([])
    }
  }

  const save = async () => {
    if (empId === '' || !effFrom) {
      setError('Select employee and effective from')
      return
    }
    const parsed = lines
      .filter((l) => l.componentId > 0 && l.amount !== '')
      .map((l) => ({ componentId: l.componentId, amount: Number(l.amount), frequency: 'MONTHLY' as const, payableOn: null }))
    if (parsed.length === 0) {
      setError('Add at least one line')
      return
    }
    try {
      await compensationApi.create({
        employeeId: empId as number,
        effectiveFrom: effFrom,
        annualCtc: annualCtc ? Number(annualCtc) : undefined,
        lines: parsed,
      })
      setLines([{ componentId: 0, amount: '' }])
      setAnnualCtc('')
      if (effectiveDate) {
        const res = await compensationApi.search({ employeeId: empId as number, effectiveDate })
        setRows(res)
      }
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const sync = async (id: number) => {
    try {
      await compensationApi.syncStructure(id)
      setError('')
      alert('Salary structure saved from compensation.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="Compensation">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack spacing={2}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>Employee</InputLabel>
            <Select
              label="Employee"
              value={empId}
              onChange={(e) => setEmpId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">Select…</MenuItem>
              {employees.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <AppTextField
              label="Effective Date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <AppButton variant="outlined" onClick={search} disabled={empId === '' || !effectiveDate}>
              Search
            </AppButton>
            <AppTypography variant="body2" color="text.secondary">
              {employeeLabel}
            </AppTypography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <AppTextField
              label="Effective from"
              type="date"
              value={effFrom}
              onChange={(e) => setEffFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <AppTextField
              label="Annual CTC (optional)"
              type="number"
              value={annualCtc}
              onChange={(e) => setAnnualCtc(e.target.value)}
              size="small"
              sx={{ width: 180 }}
            />
          </Stack>
          {lines.map((ln, i) => (
            <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Component</InputLabel>
                <Select
                  label="Component"
                  value={ln.componentId}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setLines((prev) => prev.map((x, j) => (j === i ? { ...x, componentId: v } : x)))
                  }}
                >
                  <MenuItem value={0}>—</MenuItem>
                  {components.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <AppTextField
                label="Amount"
                type="number"
                value={ln.amount}
                onChange={(e) =>
                  setLines((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
                }
                size="small"
                sx={{ width: 140 }}
              />
            </Stack>
          ))}
          <Box>
            <AppButton variant="outlined" onClick={addLine} sx={{ mr: 1 }}>
              Add line
            </AppButton>
            <AppButton variant="contained" onClick={save} disabled={empId === ''}>
              Save compensation
            </AppButton>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
          <AppTypography variant="subtitle1" fontWeight={700}>
            Results
          </AppTypography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>CTC</TableCell>
              <TableCell>Monthly payable</TableCell>
              <TableCell>Annual bonus</TableCell>
              <TableCell>Joining bonus</TableCell>
              <TableCell align="center">Lines</TableCell>
              <TableCell align="right">Sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <AppTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No compensation rows.
                  </AppTypography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.effectiveFrom}</TableCell>
                <TableCell>{r.effectiveTo ?? '—'}</TableCell>
                <TableCell>{r.annualCtc ?? '—'}</TableCell>
                <TableCell>
                  {r.lines
                    .filter((l) => l.frequency === 'MONTHLY')
                    .reduce((s, l) => s + num(l.amount), 0) || '—'}
                </TableCell>
                <TableCell>
                  {r.lines
                    .filter((l) => l.frequency === 'YEARLY' && l.componentCode === 'ANNUAL_BONUS')
                    .reduce((s, l) => s + num(l.amount), 0) || '—'}
                </TableCell>
                <TableCell>
                  {r.lines
                    .filter((l) => l.frequency === 'ONE_TIME' && l.componentCode === 'JOINING_BONUS')
                    .reduce((s, l) => s + num(l.amount), 0) || '—'}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelected(r)
                      setOpenLines(true)
                    }}
                    aria-label="View lines"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell align="right">
                  <AppButton size="small" variant="outlined" onClick={() => sync(r.id)}>
                    Sync to salary structure
                  </AppButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openLines} onClose={() => setOpenLines(false)} fullWidth maxWidth="sm">
        <DialogTitle>Compensation lines</DialogTitle>
        <DialogContent>
          <AppTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {selected ? `Effective from ${selected.effectiveFrom}` : ''}
          </AppTypography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Payable on</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(selected?.lines ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    {l.componentCode} — {l.componentName}
                  </TableCell>
                  <TableCell>{l.frequency}</TableCell>
                  <TableCell>{l.payableOn ?? '—'}</TableCell>
                  <TableCell align="right">{l.amount}</TableCell>
                </TableRow>
              ))}
              {(selected?.lines ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <AppTypography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                      No lines.
                    </AppTypography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
