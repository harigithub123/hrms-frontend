import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
} from '@mui/material'
import { departmentsApi, designationsApi, employeesApi, offersApi, payrollApi } from '../api/client'
import type { JobOffer, OfferTemplate, SalaryComponent } from '../types/hrms'
import type { Department, Designation, Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'
import { CommonInputForm, DataGrid } from '../components/shared'
import type { GridQueryParams, GridQueryResult } from '../components/shared'
import { getOfferColumnDefs } from './offers/offerColumns'
import { EMPTY_OFFER_FORM, getOfferFormFields, OFFER_TEXT_RULES, type OfferFormValues } from './offers/offerFormConfig'

export default function OffersPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [templates, setTemplates] = useState<OfferTemplate[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [desigs, setDesigs] = useState<Designation[]>([])
  const [emps, setEmps] = useState<Employee[]>([])
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tab, setTab] = useState<'offers' | 'templates'>('offers')

  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState(
    '<p>Dear {{candidateName}},</p><p>Role: {{designation}} in {{department}}. Start {{joinDate}}. CTC {{currency}} {{annualCtc}}.</p>',
  )

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

  const [lines, setLines] = useState<{ componentId: number; amount: string }[]>([{ componentId: 0, amount: '' }])

  const load = () => {
    setLoading(true)
    Promise.all([
      offersApi.listTemplates(),
      departmentsApi.listAll(),
      designationsApi.listAll(),
      employeesApi.listAll(),
      payrollApi.componentsAll(),
    ])
      .then(([t, d, de, e, comps]) => {
        setTemplates(t)
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

  const saveTemplate = async () => {
    try {
      await offersApi.createTemplate({ name: tplName.trim(), bodyHtml: tplBody, active: true })
      setTplName('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

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

  const templateOptions = useMemo(
    () => templates.map((t) => ({ value: String(t.id), label: t.name })),
    [templates],
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
        templateOptions,
        departmentOptions,
        designationOptions,
        managerOptions,
      }),
    [templateOptions, departmentOptions, designationOptions, managerOptions],
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
    setLines([{ componentId: 0, amount: '' }])
    setOpen(true)
  }

  const close = () => setOpen(false)

  const addLine = () => setLines((l) => [...l, { componentId: 0, amount: '' }])

  const submitOffer = async () => {
    setSubmitError('')
    const errs = validateForm(formValues)
    setFormErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    const parseId = (v: string) => (v === '' ? undefined : Number(v))

    const parsedLines = lines
      .filter((l) => l.componentId > 0 && l.amount.trim() !== '')
      .map((l) => ({ componentId: l.componentId, amount: Number(l.amount) }))

    try {
      await offersApi.createOffer({
        templateId: parseId(formValues.templateId),
        employeeType: formValues.employeeType || null,
        candidateName: formValues.candidateName.trim(),
        candidateEmail: formValues.candidateEmail.trim() || null,
        candidateMobile: formValues.candidateMobile.trim() || null,
        departmentId: parseId(formValues.departmentId),
        designationId: parseId(formValues.designationId),
        managerId: parseId(formValues.managerId),
        joinDate: formValues.joinDate || null,
        offerReleaseDate: formValues.offerReleaseDate || null,
        probationPeriodMonths: formValues.probationPeriodMonths ? Number(formValues.probationPeriodMonths) : null,
        joiningBonus: formValues.joiningBonus ? Number(formValues.joiningBonus) : null,
        yearlyBonus: formValues.yearlyBonus ? Number(formValues.yearlyBonus) : null,
        annualCtc: formValues.annualCtc ? Number(formValues.annualCtc) : null,
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

  const join = async (row: JobOffer) => {
    if (!window.confirm('Mark joined and create employee + salary structure from offer compensation?')) return
    try {
      await offersApi.join(row.id)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const columnDefs = useMemo(
    () =>
      getOfferColumnDefs({
        onRelease: release,
        onResend: resend,
        onDownloadPdf: (r) => downloadPdf(r.id),
        onAccept: accept,
        onReject: reject,
        onJoin: join,
      }),
    [accept],
  )

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Offers & templates"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">
            Back
          </AppButton>
          {tab === 'offers' && (
            <>
              <AppButton variant="outlined" onClick={exportCsv}>
                Export CSV
              </AppButton>
              <AppButton variant="contained" onClick={openCreate}>
                Create offer
              </AppButton>
            </>
          )}
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <AppButton variant={tab === 'offers' ? 'contained' : 'outlined'} onClick={() => setTab('offers')}>
          Offers
        </AppButton>
        <AppButton variant={tab === 'templates' ? 'contained' : 'outlined'} onClick={() => setTab('templates')}>
          Templates
        </AppButton>
      </Stack>

      {tab === 'templates' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
            New template
          </AppTypography>
          <AppTextField label="Name" value={tplName} onChange={(e) => setTplName(e.target.value)} fullWidth sx={{ mb: 1 }} />
          <AppTextField
            label="Body HTML (placeholders: {{candidateName}}, {{department}}, {{designation}}, {{managerName}}, {{joinDate}}, {{annualCtc}}, {{currency}})"
            value={tplBody}
            onChange={(e) => setTplBody(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            sx={{ mb: 1 }}
          />
          <AppButton variant="contained" onClick={saveTemplate}>
            Save template
          </AppButton>
        </Paper>
      )}

      {tab === 'offers' && (
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
                <MenuItem value="DRAFT">DRAFT</MenuItem>
                <MenuItem value="SENT">SENT</MenuItem>
                <MenuItem value="ACCEPTED">ACCEPTED</MenuItem>
                <MenuItem value="REJECTED">REJECTED</MenuItem>
                <MenuItem value="JOINED">JOINED</MenuItem>
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
              Apply
            </AppButton>
          </Stack>
        </Paper>
      )}

      {tab === 'offers' && (
        <DataGrid<JobOffer>
          columnDefs={columnDefs}
          fetchRows={fetchRows}
          getRowId={(row) => String(row.id)}
          refreshToken={refreshToken}
          defaultPageSize={10}
          pageSizeOptions={[10, 15, 20, 50]}
          height="calc(100svh - 230px)"
        />
      )}

      <CommonInputForm<OfferFormValues>
        open={open}
        title="Create offer"
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
            <AppTypography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Compensation (components)
            </AppTypography>
            <Stack spacing={1}>
              {lines.map((ln, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 240 }}>
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
                    size="small"
                    value={ln.amount}
                    onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                    sx={{ width: 160 }}
                  />
                </Stack>
              ))}
              <Box>
                <AppButton size="small" variant="outlined" onClick={addLine}>
                  Add line
                </AppButton>
              </Box>
            </Stack>
          </Box>
        }
      />
    </PageLayout>
  )
}
