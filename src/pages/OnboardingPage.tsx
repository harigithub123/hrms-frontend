import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
} from '@mui/material'
import { departmentsApi, designationsApi, employeesApi, onboardingApi, offersApi } from '../api/client'
import type { JobOffer, OnboardingCase } from '../types/hrms'
import type { Department, Designation, Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

export default function OnboardingPage() {
  const [cases, setCases] = useState<OnboardingCase[]>([])
  const [offers, setOffers] = useState<JobOffer[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [desigs, setDesigs] = useState<Designation[]>([])
  const [emps, setEmps] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fn, setFn] = useState('')
  const [ln, setLn] = useState('')
  const [em, setEm] = useState('')
  const [jd, setJd] = useState('')
  const [deptId, setDeptId] = useState<number | ''>('')
  const [desigId, setDesigId] = useState<number | ''>('')
  const [mgrId, setMgrId] = useState<number | ''>('')
  const [offerId, setOfferId] = useState<number | ''>('')

  const load = () => {
    setLoading(true)
    Promise.all([
      onboardingApi.list(),
      offersApi.listOffers(),
      departmentsApi.listAll(),
      designationsApi.listAll(),
      employeesApi.listAll(),
    ])
      .then(([c, o, d, de, e]) => {
        setCases(c)
        setOffers(o.filter((x) => x.status === 'ACCEPTED'))
        setDepts(d)
        setDesigs(de)
        setEmps(e)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    if (!fn.trim() || !ln.trim() || !jd) {
      setError('First name, last name, and join date required')
      return
    }
    try {
      await onboardingApi.create({
        candidateFirstName: fn.trim(),
        candidateLastName: ln.trim(),
        candidateEmail: em || undefined,
        joinDate: jd,
        departmentId: deptId === '' ? undefined : (deptId as number),
        designationId: desigId === '' ? undefined : (desigId as number),
        managerId: mgrId === '' ? undefined : (mgrId as number),
        offerId: offerId === '' ? undefined : (offerId as number),
      })
      setFn('')
      setLn('')
      setEm('')
      setJd('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const toggleTask = async (caseId: number, taskId: number, done: boolean) => {
    await onboardingApi.toggleTask(caseId, taskId, done)
    load()
  }

  const complete = async (id: number) => {
    if (!window.confirm('Create employee record, allocate leave balances for join year, and mark completed?')) return
    try {
      await onboardingApi.complete(id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="Employee onboarding">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
          New onboarding case
        </AppTypography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <AppTextField label="First name" value={fn} onChange={(e) => setFn(e.target.value)} size="small" />
            <AppTextField label="Last name" value={ln} onChange={(e) => setLn(e.target.value)} size="small" />
            <AppTextField label="Email" value={em} onChange={(e) => setEm(e.target.value)} size="small" />
          </Stack>
          <AppTextField
            label="Join date"
            type="date"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ maxWidth: 200 }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Department</InputLabel>
              <Select label="Department" value={deptId} onChange={(e) => setDeptId(e.target.value === '' ? '' : Number(e.target.value))}>
                <MenuItem value="">—</MenuItem>
                {depts.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Designation</InputLabel>
              <Select label="Designation" value={desigId} onChange={(e) => setDesigId(e.target.value === '' ? '' : Number(e.target.value))}>
                <MenuItem value="">—</MenuItem>
                {desigs.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Manager</InputLabel>
              <Select label="Manager" value={mgrId} onChange={(e) => setMgrId(e.target.value === '' ? '' : Number(e.target.value))}>
                <MenuItem value="">—</MenuItem>
                {emps.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Accepted offer</InputLabel>
              <Select label="Accepted offer" value={offerId} onChange={(e) => setOfferId(e.target.value === '' ? '' : Number(e.target.value))}>
                <MenuItem value="">—</MenuItem>
                {offers.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.candidateName} (#{o.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <AppButton variant="contained" onClick={create}>
            Create case
          </AppButton>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
          <AppTypography variant="subtitle1" fontWeight={700}>
            Cases
          </AppTypography>
        </Box>
        {cases.map((c) => (
          <Box key={c.id} sx={{ px: 2, py: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="flex-start">
              <Box>
                <AppTypography fontWeight={700}>
                  {c.candidateFirstName} {c.candidateLastName} — {c.status}
                </AppTypography>
                <AppTypography variant="body2" color="text.secondary">
                  Join {c.joinDate}
                  {c.employeeId != null ? ` · Employee #${c.employeeId}` : ''}
                </AppTypography>
                <Stack component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
                  {c.tasks.map((t) => (
                    <li key={t.id} style={{ listStyle: 'none', marginLeft: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Checkbox
                          size="small"
                          checked={t.done}
                          disabled={c.status === 'COMPLETED'}
                          onChange={(e) => toggleTask(c.id, t.id, e.target.checked)}
                        />
                        {t.label}
                      </label>
                    </li>
                  ))}
                </Stack>
              </Box>
              {c.status !== 'COMPLETED' && (
                <AppButton variant="contained" color="success" onClick={() => complete(c.id)}>
                  Complete (create employee)
                </AppButton>
              )}
            </Stack>
          </Box>
        ))}
        {cases.length === 0 && (
          <AppTypography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No onboarding cases yet.
          </AppTypography>
        )}
      </Paper>
    </PageLayout>
  )
}
