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
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
} from '@mui/material'
import { departmentsApi, designationsApi, employeesApi, offersApi, payrollApi } from '../../api/client'
import type { JobOffer, JobOfferStatus, SalaryComponent } from '../../types/hrms'
import type { Department, Designation, Employee } from '../../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid, getFormFieldsGridSx } from '../../components/shared'
import type { GridQueryParams, GridQueryResult } from '../../components/shared'
import { getOfferColumnDefs } from './offerColumns'
import {
  EMPTY_OFFER_FORM,
  getOfferFormFields,
  OFFER_LINE_FREQUENCY_OPTIONS,
  OFFER_TEXT_RULES,
  type OfferFormValues,
  type OfferLineFrequency,
} from './offerFormConfig'

export default function OffersPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [depts, setDepts] = useState<Department[]>([])
  const [desigs, setDesigs] = useState<Designation[]>([])
  const [emps, setEmps] = useState<Employee[]>([])
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState<{
    status: string
    employeeType: string
    q: string
    departmentId: number | ''
    designationId: number | ''
  }>({
    status: '',
    employeeType: '',
    q: '',
    departmentId: '',
    designationId: '',
  })

  const [open, setOpen] = useState(false)
  const [formValues, setFormValues] = useState<OfferFormValues>(EMPTY_OFFER_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OfferFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')

  const [joinOffer, setJoinOffer] = useState<JobOffer | null>(null)
  const [joinActualDate, setJoinActualDate] = useState('')
  const [joinConfirmAccepted, setJoinConfirmAccepted] = useState(false)
  const [joinDialogError, setJoinDialogError] = useState('')
  const [joinSubmitting, setJoinSubmitting] = useState(false)

  const deriveFrequencyForComponentCode = useCallback(
    (code?: string | null): OfferLineFrequency => {
      if (code === 'ANNUAL_BONUS') return 'YEARLY'
      if (code === 'JOINING_BONUS') return 'ONE_TIME'
      return 'MONTHLY'
    },
    [],
  )

  const [lines, setLines] = useState<{ componentId: number; amount: string; frequency: OfferLineFrequency }[]>([
    { componentId: 0, amount: '', frequency: 'MONTHLY' },
  ])

  const annualCtcFromLines = useMemo(() => {
    let total = 0
    let hasAnyLine = false

    for (const ln of lines) {
      if (ln.componentId <= 0) continue

      const trimmed = ln.amount.trim()
      if (!trimmed) continue

      const amount = Number(trimmed)
      if (Number.isNaN(amount)) continue

      hasAnyLine = true

      switch (ln.frequency) {
        case 'MONTHLY':
          total += amount * 12
          break
        case 'YEARLY':
          total += amount
          break
        case 'ONE_TIME':
          total += amount
          break
      }
    }

    if (!hasAnyLine) return ''

    // Match backend rounding behaviour (scale=2, HALF_UP).
    const rounded = Math.round(total * 100) / 100
    return String(rounded)
  }, [lines])

  const statusDisplayName = (s: JobOfferStatus | string | null | undefined) => {
    if (!s) return '—'
    switch (s) {
      case 'DRAFT':
      case 'Draft':
        return 'Draft'
      case 'SENT':
      case 'Sent':
        return 'Sent'
      case 'ACCEPTED':
      case 'Accepted':
        return 'Accepted'
      case 'REJECTED':
      case 'Rejected':
        return 'Rejected'
      case 'DECLINED':
      case 'Declined':
        return 'Declined'
      case 'JOINED':
      case 'Joined':
        return 'Joined'
      case 'EXPIRED':
      case 'Expired':
        return 'Expired'
      default:
        return String(s)
    }
  }

  const employeeTypeDisplayName = (et: string | null | undefined) => {
    if (!et) return '—'
    switch (et) {
      case 'PERMANENT_FULL_TIME':
      case 'Permanent - Full time':
        return 'Permanent - Full time'
      case 'PERMANENT_PART_TIME':
      case 'Permanent - Part time':
        return 'Permanent - Part time'
      case 'CONTRACT':
      case 'Contract':
        return 'Contract'
      default:
        return et
    }
  }

  const load = () => {
    setLoading(true)
    Promise.all([
      departmentsApi.listAll(),
      designationsApi.listAll(),
      employeesApi.listAll(),
      payrollApi.componentsAll(),
    ])
      .then(([d, de, e, comps]) => {
        setDepts(d)
        setDesigs(de)
        setEmps(e)
        setComponents(comps.filter((x) => x.active && x.kind === 'EARNING'))
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const downloadPdf = async (id: number) => {
    try {
      const { blob, filename } = await offersApi.downloadPdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const exportCsv = async () => {
    try {
      const { blob, filename } = await offersApi.exportCsv({
        status: filters.status || null,
        employeeType: filters.employeeType || null,
        q: filters.q || null,
        departmentId: filters.departmentId === '' ? null : (filters.departmentId as number),
        designationId: filters.designationId === '' ? null : (filters.designationId as number),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const fetchRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<JobOffer>> => {
      const res = await offersApi.listOffersPaged({
        page,
        size: pageSize,
        status: filters.status || null,
        employeeType: filters.employeeType || null,
        q: filters.q || null,
        departmentId: filters.departmentId === '' ? null : (filters.departmentId as number),
        designationId: filters.designationId === '' ? null : (filters.designationId as number),
      })
      return { rows: res.content, totalRows: res.totalElements }
    },
    [filters],
  )

  const departmentOptions = useMemo(() => depts.map((d) => ({ value: String(d.id), label: d.name })), [depts])
  const designationOptions = useMemo(() => desigs.map((d) => ({ value: String(d.id), label: d.name })), [desigs])
  const managerOptions = useMemo(
    () => emps.map((m) => ({ value: String(m.id), label: `${m.firstName} ${m.lastName}`.trim() })),
    [emps],
  )

  const formFields = useMemo(
    () =>
      getOfferFormFields({
        departmentOptions,
        designationOptions,
        managerOptions,
      }),
    [departmentOptions, designationOptions, managerOptions],
  )

  const validateField = useCallback((name: keyof OfferFormValues, value: string): string => {
    const rule = OFFER_TEXT_RULES.find((r) => r.name === name)
    if (!rule) return ''
    const trimmed = value.trim()
    if (rule.required && !trimmed) return `${rule.label} is required`
    if (rule.maxLength && value.length > rule.maxLength) return `${rule.label} cannot exceed ${rule.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: OfferFormValues) => {
      const next: Partial<Record<keyof OfferFormValues, string>> = {}
      for (const rule of OFFER_TEXT_RULES) {
        const err = validateField(rule.name, values[rule.name])
        if (err) next[rule.name] = err
      }
      return next
    },
    [validateField],
  )

  const handleFieldChange = useCallback((name: keyof OfferFormValues & string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name as keyof OfferFormValues]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof OfferFormValues & string) => {
      setFormErrors((prev) => ({ ...prev, [name]: validateField(name as keyof OfferFormValues, formValues[name]) }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setFormValues(EMPTY_OFFER_FORM)
    setFormErrors({})
    setSubmitError('')
    setLines([{ componentId: 0, amount: '', frequency: 'MONTHLY' }])
    setOpen(true)
  }

  const close = () => setOpen(false)

  const addLine = () =>
    setLines((l) => [...l, { componentId: 0, amount: '', frequency: 'MONTHLY' }])

  const submitOffer = async () => {
    setSubmitError('')
    const errs = validateForm(formValues)
    setFormErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    const parseId = (v: string) => (v === '' ? undefined : Number(v))

    const parsedLines = lines
      .filter((l) => l.componentId > 0 && l.amount.trim() !== '')
      .map((l) => ({ componentId: l.componentId, amount: Number(l.amount), frequency: l.frequency }))

    try {
      await offersApi.createOffer({
        employeeType: formValues.employeeType || null,
        candidateName: formValues.candidateName.trim(),
        candidateEmail: formValues.candidateEmail.trim() || null,
        candidateMobile: formValues.candidateMobile.trim() || null,
        departmentId: parseId(formValues.departmentId),
        designationId: parseId(formValues.designationId),
        joiningDate: formValues.joinDate || null,
        offerReleaseDate: formValues.offerReleaseDate || null,
        probationPeriodMonths: formValues.probationPeriodMonths ? Number(formValues.probationPeriodMonths) : null,
        annualCtc: annualCtcFromLines ? Number(annualCtcFromLines) : null,
        currency: formValues.currency.trim() || null,
        compensationLines: parsedLines.length ? parsedLines : undefined,
      })
      close()
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const release = async (row: JobOffer) => {
    try {
      await offersApi.send(row.id)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const resend = async (row: JobOffer) => {
    try {
      await offersApi.resend(row.id)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const accept = async (row: JobOffer) => {
    try {
      await offersApi.accept(row.id)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const reject = async (row: JobOffer) => {
    if (!window.confirm('Mark this offer as rejected?')) return
    try {
      await offersApi.reject(row.id)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const openJoinDialog = useCallback((row: JobOffer) => {
    setJoinOffer(row)
    setJoinActualDate((row.joiningDate ?? new Date().toISOString().slice(0, 10)) as string)
    setJoinConfirmAccepted(false)
    setJoinDialogError('')
  }, [])

  const closeJoinDialog = useCallback(() => {
    setJoinOffer(null)
    setJoinDialogError('')
  }, [])

  const submitJoin = async () => {
    if (!joinOffer) return
    setJoinDialogError('')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(joinActualDate.trim())) {
      setJoinDialogError('Use actual joining date in YYYY-MM-DD format.')
      return
    }
    if (!joinConfirmAccepted) {
      setJoinDialogError('Confirm that the candidate has accepted the offer before marking joined.')
      return
    }
    setJoinSubmitting(true)
    try {
      await offersApi.action(joinOffer.id, {
        action: 'JOIN',
        join: {
          actualJoiningDate: joinActualDate.trim(),
          confirmCandidateAcceptedOffer: true,
        },
      })
      closeJoinDialog()
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setJoinDialogError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setJoinSubmitting(false)
    }
  }

  const columnDefs = useMemo(
    () => {
      const baseCols = getOfferColumnDefs({
        onRelease: release,
        onResend: resend,
        onDownloadPdf: (r) => downloadPdf(r.id),
        onAccept: accept,
        onReject: reject,
        onJoin: openJoinDialog,
      })
      // Override label rendering (keep underlying keys for action enablement).
      return baseCols.map((col) => {
        if (col.field === 'employeeType') {
          return {
            ...col,
            valueFormatter: (p: { value: unknown }) => employeeTypeDisplayName(p.value as string | null | undefined),
          }
        }
        if (col.field === 'status') {
          return {
            ...col,
            valueFormatter: (p: { value: unknown }) => statusDisplayName(p.value as JobOfferStatus | string | null | undefined),
          }
        }
        return col
      })
    },
    [accept, openJoinDialog],
  )

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Offers"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton variant="outlined" onClick={exportCsv}>
            Export CSV
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Create offer
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => {
                setFilters((p) => ({ ...p, status: e.target.value }))
                setRefreshToken((t) => t + 1)
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
              <MenuItem value="ACCEPTED">Accepted</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="JOINED">Joined</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Employee type</InputLabel>
            <Select
              label="Employee type"
              value={filters.employeeType}
              onChange={(e) => {
                setFilters((p) => ({ ...p, employeeType: e.target.value }))
                setRefreshToken((t) => t + 1)
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PERMANENT_FULL_TIME">Permanent - Full time</MenuItem>
              <MenuItem value="PERMANENT_PART_TIME">Permanent - Part time</MenuItem>
              <MenuItem value="CONTRACT">Contract</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Department</InputLabel>
            <Select
              label="Department"
              value={filters.departmentId}
              onChange={(e) => {
                setFilters((p) => ({ ...p, departmentId: e.target.value === '' ? '' : Number(e.target.value) }))
                setRefreshToken((t) => t + 1)
              }}
            >
              <MenuItem value="">All</MenuItem>
              {depts.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Designation</InputLabel>
            <Select
              label="Designation"
              value={filters.designationId}
              onChange={(e) => {
                setFilters((p) => ({ ...p, designationId: e.target.value === '' ? '' : Number(e.target.value) }))
                setRefreshToken((t) => t + 1)
              }}
            >
              <MenuItem value="">All</MenuItem>
              {desigs.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <AppTextField
            label="Search (name/email)"
            size="small"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setRefreshToken((t) => t + 1)
            }}
            sx={{ minWidth: 240 }}
          />
          <AppButton
            variant="outlined"
            onClick={() => setRefreshToken((t) => t + 1)}
            sx={{ flexShrink: 0 }}
          >
            Search
          </AppButton>
        </Stack>
      </Paper>

      <DataGrid<JobOffer>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={[10, 15, 20, 50]}
        height="calc(100svh - 230px)"
      />

      <CommonInputForm<OfferFormValues>
        open={open}
        title="Create offer"
        maxWidth="md"
        fieldsPerRow={2}
        fields={formFields}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={close}
        onSubmit={submitOffer}
        submitLabel="Create"
        extraContent={
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 1 }}>
              <AppTypography variant="body2" color="text.secondary">
                Annual CTC : <b>{formValues.currency.trim() || 'INR'} {annualCtcFromLines || '—'}</b>
              </AppTypography>
            </Box>
            <AppTypography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Compensation (components)
            </AppTypography>
            <Box sx={getFormFieldsGridSx(3)}>
              {lines.map((ln, i) => (
                <Box key={i} sx={{ display: 'contents' }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Component</InputLabel>
                    <Select
                      label="Component"
                      value={ln.componentId}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        const comp = components.find((c) => c.id === v)
                        const nextFrequency = deriveFrequencyForComponentCode(comp?.code)
                        setLines((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, componentId: v, frequency: nextFrequency } : x,
                          ),
                        )
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

                  <FormControl size="small" fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      label="Frequency"
                      value={ln.frequency}
                      onChange={(e) => {
                        const next = e.target.value as OfferLineFrequency
                        setLines((prev) => prev.map((x, j) => (j === i ? { ...x, frequency: next } : x)))
                      }}
                    >
                      {OFFER_LINE_FREQUENCY_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
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

      <Dialog
        open={joinOffer != null}
        onClose={() => {
          if (!joinSubmitting) closeJoinDialog()
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mark joined</DialogTitle>
        <DialogContent>
          {joinOffer && (
            <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {joinOffer.candidateName} — offer #{joinOffer.id}
            </AppTypography>
          )}
          {joinDialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {joinDialogError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <AppTextField
              label="Actual joining date"
              type="date"
              value={joinActualDate}
              onChange={(e) => setJoinActualDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={joinConfirmAccepted}
                  onChange={(e) => setJoinConfirmAccepted(e.target.checked)}
                />
              }
              label="I confirm the candidate has accepted this offer (required to record a join in the system)."
            />
            <AppTypography variant="body2" color="text.secondary">
              This updates the offer to Joined and prepares onboarding tasks. Payroll compensation is copied from the
              offer when you complete onboarding, not at this step.
            </AppTypography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton onClick={() => !joinSubmitting && closeJoinDialog()} disabled={joinSubmitting}>
            Cancel
          </AppButton>
          <AppButton variant="contained" onClick={() => void submitJoin()} disabled={joinSubmitting}>
            Mark joined
          </AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
