import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { payrollApi } from '../../api/client'
import type { PayrollFixedComponentSetting, SalaryComponent } from '../../types/hrms'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../../components/ui'

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed'
}

export default function PayrollFixedComponentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fixed, setFixed] = useState<PayrollFixedComponentSetting[]>([])
  const [allComponents, setAllComponents] = useState<SalaryComponent[]>([])

  const [addComponentId, setAddComponentId] = useState<number | ''>('')
  const [addAmount, setAddAmount] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [f, comps] = await Promise.all([payrollApi.listFixedComponents(), payrollApi.componentsAll()])
      setFixed(f)
      setAllComponents(comps.filter((c) => c.active))
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const configuredIds = useMemo(() => new Set(fixed.map((x) => x.componentId)), [fixed])

  const availableToAdd = useMemo(
    () => allComponents.filter((c) => !configuredIds.has(c.id)),
    [allComponents, configuredIds],
  )

  const add = async () => {
    if (addComponentId === '' || !addAmount.trim()) return
    const n = Number(addAmount.trim())
    if (Number.isNaN(n) || n < 0) {
      setError('Enter a valid non-negative amount')
      return
    }
    setSaving(true)
    setError('')
    try {
      await payrollApi.upsertFixedComponent(addComponentId, n)
      setAddComponentId('')
      setAddAmount('')
      await load()
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (editId == null) return
    const n = Number(editAmount.trim())
    if (Number.isNaN(n) || n < 0) {
      setError('Enter a valid non-negative amount')
      return
    }
    setSaving(true)
    setError('')
    try {
      await payrollApi.upsertFixedComponent(editId, n)
      setEditId(null)
      await load()
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (componentId: number) => {
    if (!window.confirm('Remove this org-wide fixed amount? Payslips will no longer include it (unless from employee compensation).')) return
    setSaving(true)
    setError('')
    try {
      await payrollApi.removeFixedComponent(componentId)
      await load()
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Fixed payroll components"
      maxWidth="lg"
      actions={
        <AppButton component={Link} to="/" variant="outlined">
          Back
        </AppButton>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Set a <strong>monthly amount</strong> for each salary component that applies to <strong>every employee</strong>{' '}
        on payslip generation (for example PF, professional tax). If an employee&apos;s compensation already includes the
        same component code, the fixed line is skipped for that person. Use{' '}
        <Link to="/hr/salary-components">Salary components</Link> to define component codes and kinds first.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <AppTypography variant="subtitle2" fontWeight={700} gutterBottom>
          Add fixed component
        </AppTypography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Component</InputLabel>
            <Select
              label="Component"
              value={addComponentId === '' ? '' : addComponentId}
              onChange={(e) => setAddComponentId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {availableToAdd.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.kind === 'DEDUCTION' ? 'deduction' : 'earning'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <AppTextField
            size="small"
            label="Monthly amount"
            type="number"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            sx={{ maxWidth: 160 }}
            inputProps={{ min: 0, step: '0.01' }}
          />
          <AppButton variant="contained" onClick={add} disabled={saving || addComponentId === '' || !addAmount.trim()}>
            Add
          </AppButton>
        </Stack>
        {availableToAdd.length === 0 && (
          <AppTypography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            All active components already have a fixed amount, or none are available.
          </AppTypography>
        )}
      </Paper>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Kind</TableCell>
            <TableCell align="right">Monthly amount</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fixed.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <AppTypography variant="body2" color="text.secondary">
                  No fixed components configured. Use “Add fixed component” above.
                </AppTypography>
              </TableCell>
            </TableRow>
          )}
          {fixed.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.componentCode}</TableCell>
              <TableCell>{row.componentName}</TableCell>
              <TableCell>{row.kind === 'DEDUCTION' ? 'Deduction' : 'Earning'}</TableCell>
              <TableCell align="right">
                {editId === row.componentId ? (
                  <AppTextField
                    size="small"
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    inputProps={{ min: 0, step: '0.01' }}
                    sx={{ width: 120 }}
                  />
                ) : (
                  Number(row.monthlyAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                )}
              </TableCell>
              <TableCell align="right">
                {editId === row.componentId ? (
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <AppButton size="small" variant="contained" onClick={saveEdit} disabled={saving}>
                      Save
                    </AppButton>
                    <AppButton size="small" onClick={() => setEditId(null)} disabled={saving}>
                      Cancel
                    </AppButton>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <AppButton
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setEditId(row.componentId)
                        setEditAmount(String(row.monthlyAmount))
                      }}
                      disabled={saving}
                    >
                      Edit
                    </AppButton>
                    <AppButton size="small" color="error" variant="outlined" onClick={() => remove(row.componentId)} disabled={saving}>
                      Remove
                    </AppButton>
                  </Stack>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageLayout>
  )
}
