import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
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
import { compensationApi, employeesApi, payrollApi } from '../../api/client'
import type { EmployeeCompensation, SalaryComponent } from '../../types/hrms'
import type { Employee } from '../../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid, getFormFieldsGridSx } from '../../components/shared'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { getCompensationColumnDefs } from './compensationColumns'
import {
  COMPENSATION_FORM_RULES,
  EMPTY_COMPENSATION_FORM,
  getCompensationFormFields,
  type CompensationFormValues,
} from './compensationFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function CompensationPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empId, setEmpId] = useState<number | ''>('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [searchResults, setSearchResults] = useState<EmployeeCompensation[]>([])
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [formValues, setFormValues] = useState<CompensationFormValues>(EMPTY_COMPENSATION_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CompensationFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')
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

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: String(e.id), label: `${e.firstName} ${e.lastName}`.trim() })),
    [employees],
  )

  const formFields = useMemo(() => getCompensationFormFields({ employeeOptions }), [employeeOptions])

  const employeeLabel = useMemo(() => {
    if (empId === '') return '—'
    const e = employees.find((x) => x.id === empId)
    return e ? `${e.firstName} ${e.lastName}`.trim() : String(empId)
  }, [empId, employees])

  const addLine = () => setLines((l) => [...l, { componentId: 0, amount: '' }])

  const validateField = useCallback((name: keyof CompensationFormValues, value: string): string => {
    const rule = COMPENSATION_FORM_RULES.find((r) => r.name === name)
    if (!rule) return ''
    const trimmed = value.trim()
    if (rule.required && !trimmed) return `${rule.label} is required`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: CompensationFormValues) => {
      const next: Partial<Record<keyof CompensationFormValues, string>> = {}
      for (const rule of COMPENSATION_FORM_RULES) {
        const err = validateField(rule.name, values[rule.name])
        if (err) next[rule.name] = err
      }
      return next
    },
    [validateField],
  )

  const handleFieldChange = useCallback((name: keyof CompensationFormValues & string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name as keyof CompensationFormValues]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof CompensationFormValues & string) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name as keyof CompensationFormValues, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setFormValues({
      ...EMPTY_COMPENSATION_FORM,
      employeeId: empId === '' ? '' : String(empId),
    })
    setFormErrors({})
    setSubmitError('')
    setLines([{ componentId: 0, amount: '' }])
    setCreateOpen(true)
  }

  const closeCreate = () => setCreateOpen(false)

  const search = useCallback(async () => {
    try {
      const res = await compensationApi.search({
        employeeId: empId === '' ? null : (empId as number),
        effectiveDate: effectiveDate || null,
      })
      setSearchResults(res)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setSearchResults([])
    }
  }, [empId, effectiveDate])

  const handleCreateSubmit = async () => {
    setSubmitError('')
    const errs = validateForm(formValues)
    setFormErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    const employeeId = formValues.employeeId === '' ? NaN : Number(formValues.employeeId)
    if (!Number.isFinite(employeeId)) {
      setFormErrors((p) => ({ ...p, employeeId: 'Employee is required' }))
      return
    }

    const parsed = lines
      .filter((l) => l.componentId > 0 && l.amount !== '')
      .map((l) => ({ componentId: l.componentId, amount: Number(l.amount), frequency: 'MONTHLY' as const, payableOn: null }))
    if (parsed.length === 0) {
      setSubmitError('Add at least one compensation line with component and amount.')
      return
    }

    try {
      await compensationApi.create({
        employeeId,
        effectiveFrom: formValues.effectiveFrom,
        annualCtc: formValues.annualCtc.trim() ? Number(formValues.annualCtc) : undefined,
        lines: parsed,
      })
      closeCreate()
      try {
        const res = await compensationApi.search({
          employeeId: empId === '' ? null : empId,
          effectiveDate: effectiveDate || null,
        })
        setSearchResults(res)
      } catch {
        /* ignore refresh errors */
      }
      setError('')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const openLinesDialog = useCallback((row: EmployeeCompensation) => {
    setSelected(row)
    setOpenLines(true)
  }, [])

  const fetchRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<EmployeeCompensation>> => {
      const start = page * pageSize
      const slice = searchResults.slice(start, start + pageSize)
      return { rows: slice, totalRows: searchResults.length }
    },
    [searchResults],
  )

  const columnDefs = useMemo(
    () => getCompensationColumnDefs({ onViewLines: openLinesDialog }),
    [openLinesDialog],
  )

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Compensation"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Create compensation
          </AppButton>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          alignItems={{ xs: 'stretch', md: 'flex-end' }}
        >
          <FormControl size="small" sx={{ minWidth: 240, width: { xs: '100%', md: 'auto' } }}>
            <InputLabel>Employee (optional)</InputLabel>
            <Select
              label="Employee (optional)"
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

          <AppTextField
            label="Effective date (optional)"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 160, width: { xs: '100%', md: 180 }, flexShrink: 0 }}
          />

          <AppButton
            variant="outlined"
            onClick={search}
            sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'auto' } }}
          >
            Search
          </AppButton>

          <AppTypography
            variant="body2"
            color="text.secondary"
            sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'center' }, lineHeight: 1.2 }}
          >
            {employeeLabel}
          </AppTypography>
        </Stack>
      </Paper>

      <DataGrid<EmployeeCompensation>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 280px)"
      />

      <CommonInputForm<CompensationFormValues>
        open={createOpen}
        title="Create compensation"
        maxWidth="md"
        fieldsPerRow={2}
        fields={formFields}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={closeCreate}
        onSubmit={handleCreateSubmit}
        submitLabel="Create"
        extraContent={
          <Box sx={{ mt: 1 }}>
            <AppTypography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Compensation lines
            </AppTypography>
            <Box sx={getFormFieldsGridSx(2)}>
              {lines.map((ln, i) => (
                <Box key={i} sx={{ display: 'contents' }}>
                  <FormControl size="small" fullWidth>
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
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <AppTextField
                    label="Amount"
                    type="number"
                    value={ln.amount}
                    onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                    sx={{ maxWidth: { xs: 'none', sm: 200 } }}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 1 }}>
              <AppButton size="small" variant="outlined" onClick={addLine}>
                Add line
              </AppButton>
            </Box>
          </Box>
        }
      />

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
                    {l.componentName}
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
