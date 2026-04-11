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
import { isExitDocumentTaskBlockedByLwd, isExitDocumentTaskName } from '../utils/exitDocumentTasks'
import type { JobOffer, OnboardingCase, OnboardingTask, OnboardingTaskStatus } from '../types/hrms'
import type { Department, Designation, Employee } from '../types/org'
import { formatEmploymentStatus } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'
import { PayrollBankDetailsForm, type PayrollBankFormPayload } from '../components/payroll/PayrollBankDetailsForm'
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
  offerId: string
}

const EMPTY_ONBOARDING_FORM: OnboardingCreateFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  joinDate: '',
  departmentId: '',
  designationId: '',
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
          View Details
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
      headerName: 'Offer #',
      field: 'offerId',
      maxWidth: 100,
      valueFormatter: (p) => (p.value != null ? String(p.value) : '—'),
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
    ])
      .then(([caseList, offerList, deptList, desigList]) => {
        setCases(caseList)
        setOffers(offerList.filter((o) => o.status === 'ACCEPTED' || o.status === 'JOINED'))
        setDepartments(deptList)
        setDesignations(desigList)
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
  }, [departments, designations, offers])

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
        offerId: parseId(formValues.offerId),
      })
      closeCreate()
      await load()
    } catch (e) {
      setSubmitError(toErrorMessage(e))
    }
  }

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

  const saveCaseBankDetails = useCallback(
    async (caseId: number, payload: PayrollBankFormPayload) => {
      await onboardingApi.saveBankDetails(caseId, {
        accountHolderName: payload.accountHolderName,
        bankName: payload.bankName,
        branch: payload.branch,
        accountNumber: payload.accountNumber,
        ifscCode: payload.ifscCode,
        accountType: payload.accountType,
        notes: payload.notes,
        effectiveFrom: payload.effectiveFrom || null,
      })
      await load()
    },
    [load],
  )

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
          <AppButton component={Link} to="/" variant="outlined">
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

      <Alert severity="info" sx={{ mb: 2 }}>
        HR-driven onboarding: work the checklist and bank details here; there is no candidate login. For hires from an
        offer, use <Link to="/hr/offers">Offers</Link> → <strong>Mark joined</strong> first so the case is created with
        the right link and tasks. Use <strong>New onboarding case</strong> only for exceptions (e.g. no offer in the
        system).
      </Alert>

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
        intro={
          <Alert severity="info" variant="outlined">
            Prefer <Link to="/hr/offers">Offers → Mark joined</Link> for standard hires so the case ties to the offer.
            Use this form when you must start onboarding without that path.
          </Alert>
        }
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
        onSaveBankDetails={saveCaseBankDetails}
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

export function OnboardingCaseTasksDialog({
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
  onSaveBankDetails,
  showCompleteCaseAction = true,
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
  /** When set, HR can capture payroll bank details on the case (hire onboarding). */
  onSaveBankDetails?: (caseId: number, payload: PayrollBankFormPayload) => Promise<void>
  /** When false, hides “Complete (create employee)” (e.g. separation / exit letter board). */
  showCompleteCaseAction?: boolean
}) {
  if (!c) return null
  const tasksReadOnly =
    c.status === 'CANCELLED' || (c.status === 'COMPLETED' && c.employeeId == null)
  const showLwdExitNotice =
    c.employeeId != null &&
    c.tasks.some((t) => isExitDocumentTaskName(t.name)) &&
    c.exitDocumentTasksEligible === false

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {c.candidateFirstName} {c.candidateLastName}
        <AppTypography variant="body2" color="text.secondary" component="span" display="block" sx={{ mt: 0.5 }}>
          Case #{c.id}
          {c.offerId != null ? (
            <>
              {' '}
              · Offer{' '}
              <Link to="/hr/offers" style={{ color: 'inherit' }}>
                #{c.offerId}
              </Link>
            </>
          ) : null}
          {' · '}
          {c.status} · Join {c.joinDate}
          {c.employeeId != null ? ` · Employee #${c.employeeId}` : ''}
          {c.employeeEmploymentStatus != null ? ` · ${formatEmploymentStatus(c.employeeEmploymentStatus)}` : ''}
        </AppTypography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {showLwdExitNotice && (
            <Alert severity="info">
              Relieving, experience, and full &amp; final letter tasks can be marked complete on or after the
              employee&apos;s last working date
              {c.employeeLastWorkingDate != null
                ? ` (${c.employeeLastWorkingDate.slice(0, 10)}).`
                : ' (set last working date on the employee record if missing).'}{' '}
              If letters are ready before that calendar day, set or backdate last working date on the employee so it
              is today or earlier; then you can mark these tasks complete.
            </Alert>
          )}
          <AppTypography variant="subtitle2" fontWeight={700}>
            Tasks
          </AppTypography>
          {c.tasks.map((t) => (
            <TaskRow
              key={`${c.id}-${t.id}-${t.name}-${t.comment ?? ''}`}
              c={c}
              t={t}
              disabled={tasksReadOnly}
              onToggle={onToggleTask}
              onStatus={onSetTaskStatus}
              onSaveComment={onSaveComment}
              onSaveName={onSaveName}
            />
          ))}
          {!tasksReadOnly && (
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
          {onSaveBankDetails && !tasksReadOnly && (
            <PayrollBankDetailsForm
              bankDetails={c.bankDetails}
              disabled={false}
              onSave={(payload) => onSaveBankDetails(c.id, payload)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton onClick={onClose}>Close</AppButton>
        {showCompleteCaseAction && !tasksReadOnly && (
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
              <ReadOnlyField label="Effective from (payroll)" value={b.effectiveFrom ?? '—'} />
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

  const lwdBlocksComplete = isExitDocumentTaskBlockedByLwd(c, t)
  const doneCheckboxDisabled = disabled || (lwdBlocksComplete && !t.done)

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox
              size="small"
              checked={t.done}
              disabled={doneCheckboxDisabled}
              onChange={(e) => onToggle(c.id, t.id, e.target.checked)}
            />
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
                <MenuItem
                  key={s}
                  value={s}
                  disabled={s === 'DONE' && lwdBlocksComplete}
                >
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
