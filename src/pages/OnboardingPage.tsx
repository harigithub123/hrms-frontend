import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { departmentsApi, designationsApi, employeesApi, onboardingApi, offersApi } from '../api/client'
import type { JobOffer, OnboardingCase, OnboardingTask, OnboardingTaskStatus } from '../types/hrms'
import type { Department, Designation, Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

const TASK_STATUSES: OnboardingTaskStatus[] = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']

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
  const [newTaskNameByCase, setNewTaskNameByCase] = useState<Record<number, string>>({})

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
        setOffers(o.filter((x) => x.status === 'ACCEPTED' || x.status === 'JOINED'))
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
    try {
      await onboardingApi.toggleTask(caseId, taskId, done)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const setTaskStatus = async (caseId: number, taskId: number, status: OnboardingTaskStatus) => {
    try {
      await onboardingApi.updateTask(caseId, taskId, { status })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const saveTaskComment = async (c: OnboardingCase, t: OnboardingTask, draft: string) => {
    const next = draft.trim() === '' ? '' : draft
    const prev = t.comment ?? ''
    if (next === prev) return
    try {
      await onboardingApi.updateTask(c.id, t.id, { comment: next })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const saveTaskName = async (c: OnboardingCase, t: OnboardingTask, draft: string) => {
    const next = draft.trim()
    if (next === '' || next === t.name) return
    try {
      await onboardingApi.updateTask(c.id, t.id, { name: next })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const addTask = async (caseId: number) => {
    const name = (newTaskNameByCase[caseId] ?? '').trim()
    if (!name) return
    try {
      await onboardingApi.addTask(caseId, { name })
      setNewTaskNameByCase((m) => ({ ...m, [caseId]: '' }))
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
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
              <InputLabel>Accepted / joined offer</InputLabel>
              <Select label="Accepted / joined offer" value={offerId} onChange={(e) => setOfferId(e.target.value === '' ? '' : Number(e.target.value))}>
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

      <AppTypography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Cases
      </AppTypography>
      {cases.map((c) => (
        <Accordion key={c.id} defaultExpanded disableGutters sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box>
              <AppTypography fontWeight={700}>
                {c.candidateFirstName} {c.candidateLastName} — {c.status}
              </AppTypography>
              <AppTypography variant="body2" color="text.secondary">
                Join {c.joinDate}
                {c.employeeId != null ? ` · Employee #${c.employeeId}` : ''}
              </AppTypography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <AppTypography variant="subtitle2" fontWeight={700}>
                Tasks
              </AppTypography>
              {c.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  c={c}
                  t={t}
                  disabled={c.status === 'COMPLETED'}
                  onToggle={toggleTask}
                  onStatus={setTaskStatus}
                  onSaveComment={saveTaskComment}
                  onSaveName={saveTaskName}
                />
              ))}
              {c.status !== 'COMPLETED' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                  <AppTextField
                    size="small"
                    label="New task name"
                    value={newTaskNameByCase[c.id] ?? ''}
                    onChange={(e) => setNewTaskNameByCase((m) => ({ ...m, [c.id]: e.target.value }))}
                    sx={{ minWidth: 240 }}
                  />
                  <AppButton variant="outlined" onClick={() => addTask(c.id)}>
                    Add task
                  </AppButton>
                </Stack>
              )}

              <BankDetailsSection c={c} onSaved={load} />

              {c.status !== 'COMPLETED' && (
                <AppButton variant="contained" color="success" onClick={() => complete(c.id)}>
                  Complete (create employee)
                </AppButton>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
      {cases.length === 0 && (
        <AppTypography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No onboarding cases yet.
        </AppTypography>
      )}
    </PageLayout>
  )
}

function TaskRow({
  c,
  t,
  disabled,
  onToggle,
  onStatus,
  onSaveComment,
  onSaveName,
}: {
  c: OnboardingCase
  t: OnboardingTask
  disabled: boolean
  onToggle: (caseId: number, taskId: number, done: boolean) => void
  onStatus: (caseId: number, taskId: number, status: OnboardingTaskStatus) => void
  onSaveComment: (c: OnboardingCase, t: OnboardingTask, draft: string) => void
  onSaveName: (c: OnboardingCase, t: OnboardingTask, draft: string) => void
}) {
  const [nameDraft, setNameDraft] = useState(t.name)
  const [commentDraft, setCommentDraft] = useState(t.comment ?? '')

  useEffect(() => {
    setNameDraft(t.name)
    setCommentDraft(t.comment ?? '')
  }, [t.name, t.comment])

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox size="small" checked={t.done} disabled={disabled} onChange={(e) => onToggle(c.id, t.id, e.target.checked)} />
            <span style={{ fontSize: 14 }}>Done</span>
          </label>
          <AppTextField
            size="small"
            label="Name"
            value={nameDraft}
            disabled={disabled}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => onSaveName(c, t, nameDraft)}
            sx={{ minWidth: 200, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={t.status}
              disabled={disabled}
              onChange={(e) => onStatus(c.id, t.id, e.target.value as OnboardingTaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <AppTextField
          size="small"
          label="Comment"
          value={commentDraft}
          disabled={disabled}
          onChange={(e) => setCommentDraft(e.target.value)}
          onBlur={() => onSaveComment(c, t, commentDraft)}
          multiline
          minRows={2}
          fullWidth
        />
        {t.auditHistory.length > 0 && (
          <Box sx={{ pl: 1, borderLeft: 2, borderColor: 'divider' }}>
            <AppTypography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
              Audit history
            </AppTypography>
            {t.auditHistory.map((a) => (
              <AppTypography key={a.id} variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {new Date(a.createdAt).toLocaleString()}
                {a.createdByUsername ? ` · ${a.createdByUsername}` : ''} · {a.action}
                {a.detail ? `: ${a.detail}` : ''}
              </AppTypography>
            ))}
          </Box>
        )}
      </Stack>
    </Paper>
  )
}

function BankDetailsSection({ c, onSaved }: { c: OnboardingCase; onSaved: () => void }) {
  const b = c.bankDetails
  const [holder, setHolder] = useState(b?.accountHolderName ?? '')
  const [bankName, setBankName] = useState(b?.bankName ?? '')
  const [branch, setBranch] = useState(b?.branch ?? '')
  const [accountNumber, setAccountNumber] = useState(b?.accountNumber ?? '')
  const [ifsc, setIfsc] = useState(b?.ifscCode ?? '')
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT'>(b?.accountType ?? 'SAVINGS')
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHolder(b?.accountHolderName ?? '')
    setBankName(b?.bankName ?? '')
    setBranch(b?.branch ?? '')
    setAccountNumber(b?.accountNumber ?? '')
    setIfsc(b?.ifscCode ?? '')
    setAccountType(b?.accountType ?? 'SAVINGS')
    setNotes(b?.notes ?? '')
  }, [b?.id, b?.updatedAt])

  const save = async () => {
    if (!holder.trim() || !bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      return
    }
    setSaving(true)
    try {
      await onboardingApi.saveBankDetails(c.id, {
        accountHolderName: holder.trim(),
        bankName: bankName.trim(),
        branch: branch.trim() || null,
        accountNumber: accountNumber.trim(),
        ifscCode: ifsc.trim(),
        accountType,
        notes: notes.trim() || null,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const disabled = c.status === 'COMPLETED'

  return (
    <Box sx={{ pt: 1 }}>
      <AppTypography variant="subtitle2" fontWeight={700} gutterBottom>
        Bank account (payroll)
      </AppTypography>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <AppTextField size="small" label="Account holder name" value={holder} disabled={disabled} onChange={(e) => setHolder(e.target.value)} sx={{ minWidth: 200 }} />
          <AppTextField size="small" label="Bank name" value={bankName} disabled={disabled} onChange={(e) => setBankName(e.target.value)} sx={{ minWidth: 200 }} />
          <AppTextField size="small" label="Branch" value={branch} disabled={disabled} onChange={(e) => setBranch(e.target.value)} sx={{ minWidth: 160 }} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <AppTextField size="small" label="Account number" value={accountNumber} disabled={disabled} onChange={(e) => setAccountNumber(e.target.value)} sx={{ minWidth: 200 }} />
          <AppTextField size="small" label="IFSC" value={ifsc} disabled={disabled} onChange={(e) => setIfsc(e.target.value)} sx={{ minWidth: 140 }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Account type</InputLabel>
            <Select label="Account type" value={accountType} disabled={disabled} onChange={(e) => setAccountType(e.target.value as 'SAVINGS' | 'CURRENT')}>
              <MenuItem value="SAVINGS">Savings</MenuItem>
              <MenuItem value="CURRENT">Current</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <AppTextField size="small" label="Notes" value={notes} disabled={disabled} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />
        {!disabled && (
          <AppButton variant="outlined" onClick={save} disabled={saving}>
            Save bank details
          </AppButton>
        )}
      </Stack>
    </Box>
  )
}
