import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
} from '@mui/material'
import { employeesApi, payrollApi } from '../api/client'
import type { Employee } from '../types/org'
import type { PayRun, Payslip, SalaryComponent, SalaryComponentKind } from '../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

function TabPanel({ value, index, children }: { value: number; index: number; children: ReactNode }) {
  if (value !== index) return null
  return <Box sx={{ pt: 2 }}>{children}</Box>
}

export default function PayrollPage() {
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [cCode, setCCode] = useState('')
  const [cName, setCName] = useState('')
  const [cKind, setCKind] = useState<SalaryComponentKind>('EARNING')
  const [cOrder, setCOrder] = useState('100')

  const [structEmp, setStructEmp] = useState<number | ''>('')
  const [structFrom, setStructFrom] = useState(new Date().toISOString().slice(0, 10))
  const [amounts, setAmounts] = useState<Record<number, string>>({})

  const [runs, setRuns] = useState<PayRun[]>([])
  const [runStart, setRunStart] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [runEnd, setRunEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedRun, setSelectedRun] = useState<number | ''>('')
  const [payslips, setPayslips] = useState<Payslip[]>([])

  const loadComponents = () => payrollApi.componentsAll().then(setComponents)
  const loadRuns = () => payrollApi.payRuns().then(setRuns)

  useEffect(() => {
    setLoading(true)
    Promise.all([loadComponents(), loadRuns(), employeesApi.listAll().then(setEmployees)])
      .then(() => setError(''))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const m: Record<number, string> = {}
    for (const c of components) {
      m[c.id] = amounts[c.id] ?? ''
    }
    setAmounts((prev) => ({ ...m, ...prev }))
  }, [components])

  useEffect(() => {
    if (selectedRun === '') {
      setPayslips([])
      return
    }
    payrollApi
      .payslipsForRun(selectedRun as number)
      .then(setPayslips)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [selectedRun])

  const addComponent = async () => {
    try {
      await payrollApi.createComponent({
        code: cCode,
        name: cName,
        kind: cKind,
        sortOrder: Number(cOrder),
        active: true,
      })
      setCCode('')
      setCName('')
      await loadComponents()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const saveStructure = async () => {
    if (structEmp === '') return
    const lines = components
      .filter((c) => c.active)
      .map((c) => {
        const raw = amounts[c.id]?.trim()
        if (!raw) return null
        const n = Number(raw)
        if (Number.isNaN(n) || n < 0) return null
        return { componentId: c.id, amount: n }
      })
      .filter(Boolean) as { componentId: number; amount: number }[]
    if (lines.length === 0) {
      setError('Enter at least one component amount')
      return
    }
    try {
      await payrollApi.saveStructure({
        employeeId: structEmp as number,
        effectiveFrom: structFrom,
        currency: 'INR',
        lines,
      })
      setError('')
      alert('Salary structure saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const createRun = async () => {
    try {
      await payrollApi.createPayRun({ periodStart: runStart, periodEnd: runEnd })
      await loadRuns()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const downloadPdf = async (id: number) => {
    try {
      const blob = await payrollApi.downloadPayslipPdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="Payroll">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Components" />
        <Tab label="Salary structure" />
        <Tab label="Pay runs" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
          Add column (Basic, HRA, Allowance, PF, …)
        </AppTypography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <AppTextField label="Code" value={cCode} onChange={(e) => setCCode(e.target.value)} sx={{ width: 120 }} />
          <AppTextField label="Name" value={cName} onChange={(e) => setCName(e.target.value)} sx={{ width: 160 }} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Kind</InputLabel>
            <Select label="Kind" value={cKind} onChange={(e) => setCKind(e.target.value as SalaryComponentKind)}>
              <MenuItem value="EARNING">EARNING</MenuItem>
              <MenuItem value="DEDUCTION">DEDUCTION</MenuItem>
            </Select>
          </FormControl>
          <AppTextField label="Sort" value={cOrder} onChange={(e) => setCOrder(e.target.value)} sx={{ width: 80 }} />
          <AppButton variant="contained" onClick={addComponent}>
            Add
          </AppButton>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {components.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.kind}</TableCell>
                <TableCell>{c.sortOrder}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter amounts per component for the employee. Only non-empty rows are saved. Creates a new effective-dated
          structure (history preserved).
        </AppTypography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Employee</InputLabel>
            <Select
              label="Employee"
              value={structEmp}
              onChange={(e) => setStructEmp(e.target.value === '' ? '' : Number(e.target.value))}
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
            label="Effective from"
            type="date"
            value={structFrom}
            onChange={(e) => setStructFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <AppButton variant="contained" onClick={saveStructure} disabled={structEmp === ''}>
            Save structure
          </AppButton>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Component</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {components
              .filter((c) => c.active)
              .map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.code} — {c.name}
                  </TableCell>
                  <TableCell>{c.kind}</TableCell>
                  <TableCell>
                    <AppTextField
                      size="small"
                      value={amounts[c.id] ?? ''}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="0"
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <AppTextField label="Period start" type="date" value={runStart} onChange={(e) => setRunStart(e.target.value)} InputLabelProps={{ shrink: true }} />
          <AppTextField label="Period end" type="date" value={runEnd} onChange={(e) => setRunEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
          <AppButton variant="contained" onClick={createRun}>
            Generate pay run
          </AppButton>
        </Box>
        <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
          Runs
        </AppTypography>
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>
                  {r.periodStart} → {r.periodEnd}
                </TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>
                  <AppButton size="small" onClick={() => setSelectedRun(r.id)}>
                    View payslips
                  </AppButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selectedRun !== '' && (
          <>
            <AppTypography variant="subtitle2" sx={{ mb: 1 }}>
              Payslips (run {selectedRun})
            </AppTypography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Gross</TableCell>
                  <TableCell>Deductions</TableCell>
                  <TableCell>Net</TableCell>
                  <TableCell align="right">PDF</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payslips.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.employeeName}</TableCell>
                    <TableCell>{p.grossAmount}</TableCell>
                    <TableCell>{p.deductionAmount}</TableCell>
                    <TableCell>{p.netAmount}</TableCell>
                    <TableCell align="right">
                      <AppButton size="small" onClick={() => downloadPdf(p.id)}>
                        Download
                      </AppButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </TabPanel>
    </PageLayout>
  )
}
