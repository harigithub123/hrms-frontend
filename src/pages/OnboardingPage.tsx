import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
} from '@mui/material'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { departmentsApi, designationsApi, employeesApi, onboardingApi, offersApi } from '../api/client'
import type { JobOffer, OnboardingCase, OnboardingTask, OnboardingTaskStatus } from '../types/hrms'
import type { Department, Designation, Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'
import { PayrollBankDetailsForm } from '../components/payroll/PayrollBankDetailsForm'
import { CommonInputForm, DataGrid } from '../components/shared'
import type { GenericFormFieldConfig, GridQueryParams, GridQueryResult } from '../components/shared'

const TASK_STATUSES: OnboardingTaskStatus[] = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed'
}

type OnboardingCreateFormValues = {
  firstName: string
  lastName: string
  email: string
  joinDate: string
  departmentId: string
  designationId: string
  managerId: string
  offerId: string
}

const EMPTY_ONBOARDING_FORM: OnboardingCreateFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  joinDate: '',
  departmentId: '',
  designationId: '',
  managerId: '',
  offerId: '',
}

type OnboardingMenuParams = {
  onEmployeeDetails: (c: OnboardingCase) => void
}

function OnboardingMenuCell(
  params: ICellRendererParams<OnboardingCase, unknown, OnboardingMenuParams>,
) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const c = params.data
  const menuParams = (params.colDef?.cellRendererParams ?? {}) as OnboardingMenuParams
  if (!c) return null

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', height: '100%' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <IconButton
        size="small"
        aria-label="Open menu"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          disabled={c.employeeId == null}
          onClick={() => {
            setAnchor(null)
            menuParams.onEmployeeDetails(c)
          }}
        >
          View employee details
        </MenuItem>
      </Menu>
    </Box>
  )
}

function getOnboardingColumnDefs(menuParams: OnboardingMenuParams): ColDef<OnboardingCase>[] {
  return [
    {
      headerName: 'Candidate',
      colId: 'candidateName',
      valueGetter: (p) =>
        `${p.data?.candidateFirstName ?? ''} ${p.data?.candidateLastName ?? ''}`.trim(),
      flex: 1.2,
      minWidth: 160,
    },
    {
      headerName: 'Email',
      field: 'candidateEmail',
      valueFormatter: (p) => (p.value ? String(p.value) : '—'),
    },
    { headerName: 'Join date', field: 'joinDate', maxWidth: 130 },
    { headerName: 'Status', field: 'status', maxWidth: 140 },
    {
      headerName: 'Department',
      field: 'departmentName',
      valueFormatter: (p) => (p.value ? String(p.value) : '—'),
    },
    {
      headerName: 'Designation',
      field: 'designationName',
      valueFormatter: (p) => (p.value ? String(p.value) : '—'),
    },
    {
      headerName: 'Manager',
      field: 'managerName',
      valueFormatter: (p) => (p.value ? String(p.value) : '—'),
    },
    {
      headerName: 'Tasks',
      colId: 'taskProgress',
      filter: false,
      sortable: false,
      maxWidth: 90,
      valueGetter: (p) => {
        const t = p.data?.tasks ?? []
        const done = t.filter((x) => x.done).length
        return `${done}/${t.length}`
      },
    },
    {
      headerName: 'Employee #',
      field: 'employeeId',
      maxWidth: 110,
      valueFormatter: (p) => (p.value != null ? String(p.value) : '—'),
    },
    {
      headerName: '',
      colId: '__onboarding_menu__',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      width: 52,
      cellRenderer: OnboardingMenuCell,
      cellRendererParams: menuParams,
    },
  ]
}

function parseId(v: string): number | undefined {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : undefined
}

export default function OnboardingPage() {
  const [cases, setCases] = useState<OnboardingCase[]>([])
  const [offers, setOffers] = useState<JobOffer[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [formValues, setFormValues] = useState<OnboardingCreateFormValues>(EMPTY_ONBOARDING_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OnboardingCreateFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const [tasksCaseId, setTasksCaseId] = useState<number | null>(null)
  const [newTaskNameByCase, setNewTaskNameByCase] = useState<Record<number, string>>({})

  const [employeeDetailCase, setEmployeeDetailCase] = useState<OnboardingCase | null>(null)

  const tasksCase = useMemo(() => cases.find((c) => c.id === tasksCaseId) ?? null, [cases, tasksCaseId])

  const load = useCallback(() => {
    return Promise.all([
      onboardingApi.list(),
      offersApi.listOffers(),
      departmentsApi.listAll(),
      designationsApi.listAll(),
      employeesApi.listAll(),
    ])
      .then(([caseList, offerList, deptList, desigList, empList]) => {
        setCases(caseList)
        setOffers(offerList.filter((o) => o.status === 'ACCEPTED' || o.status === 'JOINED'))
        setDepartments(deptList)
        setDesignations(desigList)
        setEmployees(empList)
        setError('')
        setRefreshToken((t) => t + 1)
      })
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setInitialLoadDone(true))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fetchOnboardingRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<OnboardingCase>> => {
      const start = page * pageSize
      return {
        rows: cases.slice(start, start + pageSize),
        totalRows: cases.length,
      }
    },
    [cases],
  )

  const openEmployeeDetails = useCallback((c: OnboardingCase) => {
    setEmployeeDetailCase(c)
  }, [])

  const columnDefs = useMemo(
    () => getOnboardingColumnDefs({ onEmployeeDetails: openEmployeeDetails }),
    [openEmployeeDetails],
  )

  const createFormFields = useMemo((): GenericFormFieldConfig<OnboardingCreateFormValues>[] => {
    return [
      { name: 'firstName', label: 'First name', required: true },
      { name: 'lastName', label: 'Last name', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'joinDate', label: 'Join date', type: 'date', required: true },
      {
        name: 'departmentId',
        label: 'Department',
        type: 'select',
        selectOptions: departments.map((d) => ({ value: String(d.id), label: d.name })),
      },
      {
        name: 'designationId',
        label: 'Designation',
        type: 'select',
        selectOptions: designations.map((d) => ({ value: String(d.id), label: d.name })),
      },
      {
        name: 'managerId',
        label: 'Manager',
        type: 'select',
        fullRow: true,
        selectOptions: employees.map((e) => ({
          value: String(e.id),
          label: `${e.firstName} ${e.lastName}`,
        })),
      },
      {
        name: 'offerId',
        label: 'Accepted / joined offer',
        type: 'select',
        fullRow: true,
        selectOptions: offers.map((o) => ({
          value: String(o.id),
          label: `${o.candidateName} (#${o.id})`,
        })),
      },
    ]
  }, [departments, designations, employees, offers])

  const validateField = useCallback((name: keyof OnboardingCreateFormValues, value: string): string => {
    const trimmed = value.trim()
    if (name === 'firstName' && !trimmed) return 'First name is required'
    if (name === 'lastName' && !trimmed) return 'Last name is required'
    if (name === 'joinDate' && !trimmed) return 'Join date is required'
    return ''
  }, [])

  const validateForm = useCallback(
    (values: OnboardingCreateFormValues) => {
      const next: Partial<Record<keyof OnboardingCreateFormValues, string>> = {}
      for (const key of ['firstName', 'lastName', 'joinDate'] as const) {
        const err = validateField(key, values[key])
        if (err) next[key] = err
      }
      return next
    },
    [validateField],
  )

  const handleFieldChange = useCallback((name: keyof OnboardingCreateFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof OnboardingCreateFormValues) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setFormValues(EMPTY_ONBOARDING_FORM)
    setFormErrors({})
    setSubmitError('')
    setCreateOpen(true)
  }

  const closeCreate = () => setCreateOpen(false)

  const handleCreateSubmit = async () => {
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    try {
      await onboardingApi.create({
        candidateFirstName: formValues.firstName.trim(),
        candidateLastName: formValues.lastName.trim(),
        candidateEmail: formValues.email.trim() || undefined,
        joinDate: formValues.joinDate,
        departmentId: parseId(formValues.departmentId),
        designationId: parseId(formValues.designationId),
        managerId: parseId(formValues.managerId),
        offerId: parseId(formValues.offerId),
      })
      closeCreate()
      await load()
    } catch (e) {
      setSubmitError(toErrorMessage(e))
    }
  }

  const bumpRefresh = useCallback(() => {
    load()
  }, [load])

  const toggleTask = async (caseId: number, taskId: number, done: boolean) => {
    try {
      await onboardingApi.toggleTask(caseId, taskId, done)
      load()
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  const setTaskStatus = async (caseId: number, taskId: number, status: OnboardingTaskStatus) => {
    try {
      await onboardingApi.updateTask(caseId, taskId, { status })
      load()
    } catch (e) {
      setError(toErrorMessage(e))
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
      setError(toErrorMessage(e))
    }
  }

  const saveTaskName = async (c: OnboardingCase, t: OnboardingTask, draft: string) => {
    const next = draft.trim()
    if (next === '' || next === t.name) return
    try {
      await onboardingApi.updateTask(c.id, t.id, { name: next })
      load()
    } catch (e) {
      setError(toErrorMessage(e))
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
      setError(toErrorMessage(e))
    }
  }

  const completeCase = async (id: number) => {
    if (!window.confirm('Create employee record, allocate leave balances for join year, and mark completed?')) return
    try {
      await onboardingApi.complete(id)
      setTasksCaseId(null)
      load()
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  if (!initialLoadDone) return <LoadingSpinner />

  return (
    <PageLayout
      title="Employee onboarding"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            New onboarding case
          </AppButton>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <DataGrid<OnboardingCase>
        columnDefs={columnDefs}
        fetchRows={fetchOnboardingRows}
        getRowId={(row) => String(row.id)}
        refreshToken={refreshToken}
        onRowClicked={(row) => setTasksCaseId(row.id)}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 170px)"
      />

      <CommonInputForm<OnboardingCreateFormValues>
        open={createOpen}
        title="New onboarding case"
        fields={createFormFields}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={closeCreate}
        onSubmit={handleCreateSubmit}
        submitLabel="Create case"
        maxWidth="md"
        fieldsPerRow={2}
      />

      <OnboardingCaseTasksDialog
        open={tasksCase != null}
        onboardingCase={tasksCase}
        newTaskName={tasksCase ? (newTaskNameByCase[tasksCase.id] ?? '') : ''}
        onNewTaskNameChange={(v) =>
          tasksCase && setNewTaskNameByCase((m) => ({ ...m, [tasksCase.id]: v }))
        }
        onClose={() => setTasksCaseId(null)}
        onToggleTask={toggleTask}
        onSetTaskStatus={setTaskStatus}
        onSaveComment={saveTaskComment}
        onSaveName={saveTaskName}
        onAddTask={addTask}
        onComplete={completeCase}
        onReload={bumpRefresh}
      />

      <EmployeeDetailsFromCaseDialog
        key={employeeDetailCase?.employeeId != null ? `emp-${employeeDetailCase.employeeId}` : 'closed'}
        open={employeeDetailCase != null}
        onboardingCase={employeeDetailCase}
        onClose={() => setEmployeeDetailCase(null)}
      />
    </PageLayout>
  )
}

function OnboardingCaseTasksDialog({
  open,
  onboardingCase: c,
  newTaskName,
  onNewTaskNameChange,
  onClose,
  onToggleTask,
  onSetTaskStatus,
  onSaveComment,
  onSaveName,
  onAddTask,
  onComplete,
  onReload,
}: {
  open: boolean
  onboardingCase: OnboardingCase | null
  newTaskName: string
  onNewTaskNameChange: (v: string) => void
  onClose: () => void
  onToggleTask: (caseId: number, taskId: number, done: boolean) => void
  onSetTaskStatus: (caseId: number, taskId: number, status: OnboardingTaskStatus) => void
  onSaveComment: (c: OnboardingCase, t: OnboardingTask, draft: string) => void
  onSaveName: (c: OnboardingCase, t: OnboardingTask, draft: string) => void
  onAddTask: (caseId: number) => void
  onComplete: (caseId: number) => void
  onReload: () => void
}) {
  if (!c) return null
  const isCompleted = c.status === 'COMPLETED'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {c.candidateFirstName} {c.candidateLastName}
        <AppTypography variant="body2" color="text.secondary" component="span" display="block" sx={{ mt: 0.5 }}>
          {c.status} · Join {c.joinDate}
          {c.employeeId != null ? ` · Employee #${c.employeeId}` : ''}
        </AppTypography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <AppTypography variant="subtitle2" fontWeight={700}>
            Tasks
          </AppTypography>
          {c.tasks.map((t) => (
            <TaskRow
              key={`${c.id}-${t.id}-${t.name}-${t.comment ?? ''}`}
              c={c}
              t={t}
              disabled={isCompleted}
              onToggle={onToggleTask}
              onStatus={onSetTaskStatus}
              onSaveComment={onSaveComment}
              onSaveName={onSaveName}
            />
          ))}
          {!isCompleted && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
              <AppTextField
                size="small"
                label="New task name"
                value={newTaskName}
                onChange={(e) => onNewTaskNameChange(e.target.value)}
                sx={{ minWidth: 240 }}
              />
              <AppButton variant="outlined" onClick={() => onAddTask(c.id)}>
                Add task
              </AppButton>
            </Stack>
          )}

          <BankDetailsSection c={c} onSaved={onReload} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton onClick={onClose}>Close</AppButton>
        {!isCompleted && (
          <AppButton variant="contained" color="success" onClick={() => onComplete(c.id)}>
            Complete (create employee)
          </AppButton>
        )}
      </DialogActions>
    </Dialog>
  )
}

function EmployeeDetailsFromCaseDialog({
  open,
  onboardingCase,
  onClose,
}: {
  open: boolean
  onboardingCase: OnboardingCase | null
  onClose: () => void
}) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!open || !onboardingCase?.employeeId) return
    let cancelled = false
    employeesApi
      .get(onboardingCase.employeeId)
      .then((e) => {
        if (!cancelled) {
          setEmployee(e)
          setFetchError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setFetchError(toErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [open, onboardingCase?.employeeId])

  const b = onboardingCase?.bankDetails
  const loadingEmployee =
    open && onboardingCase?.employeeId != null && employee == null && fetchError === ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Employee details</DialogTitle>
      <DialogContent dividers>
        {onboardingCase && (
          <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            From onboarding: {onboardingCase.candidateFirstName} {onboardingCase.candidateLastName} (case #{onboardingCase.id})
          </AppTypography>
        )}
        {loadingEmployee && <AppTypography variant="body2">Loading employee…</AppTypography>}
        {fetchError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fetchError}
          </Alert>
        )}
        {employee && !loadingEmployee && (
          <Stack spacing={1.5}>
            <ReadOnlyField label="Employee code" value={employee.employeeCode ?? '—'} />
            <ReadOnlyField label="Name" value={`${employee.firstName} ${employee.lastName}`} />
            <ReadOnlyField label="Email" value={employee.email ?? '—'} />
            <ReadOnlyField label="Mobile" value={employee.mobileNumber ?? '—'} />
            <ReadOnlyField label="Department" value={employee.departmentName ?? '—'} />
            <ReadOnlyField label="Designation" value={employee.designationName ?? '—'} />
            <ReadOnlyField label="Manager" value={employee.managerName ?? '—'} />
            <ReadOnlyField label="Joined" value={employee.joinedAt ?? '—'} />
          </Stack>
        )}

        <Box sx={{ mt: 3 }}>
          <AppTypography variant="subtitle2" fontWeight={700} gutterBottom>
            Bank account (onboarding / payroll)
          </AppTypography>
          {b ? (
            <Stack spacing={1}>
              <ReadOnlyField label="Account holder" value={b.accountHolderName} />
              <ReadOnlyField label="Bank" value={b.bankName} />
              <ReadOnlyField label="Branch" value={b.branch ?? '—'} />
              <ReadOnlyField label="Account number" value={b.accountNumber} />
              <ReadOnlyField label="IFSC" value={b.ifscCode} />
              <ReadOnlyField label="Account type" value={b.accountType} />
              <ReadOnlyField label="Notes" value={b.notes ?? '—'} />
            </Stack>
          ) : (
            <AppTypography variant="body2" color="text.secondary">
              No bank details stored on this onboarding case.
            </AppTypography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <AppButton onClick={onClose}>Close</AppButton>
      </DialogActions>
    </Dialog>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <AppTextField size="small" label={label} value={value} fullWidth InputProps={{ readOnly: true }} />
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
  const bankDisabled = c.status === 'CANCELLED'
  return (
    <PayrollBankDetailsForm
      bankDetails={c.bankDetails}
      disabled={bankDisabled}
      onSave={async (body) => {
        await onboardingApi.saveBankDetails(c.id, {
          accountHolderName: body.accountHolderName,
          bankName: body.bankName,
          branch: body.branch,
          accountNumber: body.accountNumber,
          ifscCode: body.ifscCode,
          accountType: body.accountType,
          notes: body.notes,
        })
        onSaved()
      }}
    />
  )
}
