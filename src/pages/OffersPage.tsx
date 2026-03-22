import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
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
import { departmentsApi, designationsApi, employeesApi, offersApi } from '../api/client'
import type { JobOffer, OfferTemplate } from '../types/hrms'
import type { Department, Designation, Employee } from '../types/org'
import { AppButton, AppTextField, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

export default function OffersPage() {
  const [templates, setTemplates] = useState<OfferTemplate[]>([])
  const [offers, setOffers] = useState<JobOffer[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [desigs, setDesigs] = useState<Designation[]>([])
  const [emps, setEmps] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'offers' | 'templates'>('offers')

  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState(
    '<p>Dear {{candidateName}},</p><p>Role: {{designation}} in {{department}}. Start {{joinDate}}. CTC {{currency}} {{annualCtc}}.</p>'
  )

  const [candName, setCandName] = useState('')
  const [tplId, setTplId] = useState<number | ''>('')
  const [deptId, setDeptId] = useState<number | ''>('')
  const [desigId, setDesigId] = useState<number | ''>('')
  const [mgrId, setMgrId] = useState<number | ''>('')
  const [join, setJoin] = useState('')
  const [ctc, setCtc] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      offersApi.listTemplates(),
      offersApi.listOffers(),
      departmentsApi.listAll(),
      designationsApi.listAll(),
      employeesApi.listAll(),
    ])
      .then(([t, o, d, de, e]) => {
        setTemplates(t)
        setOffers(o)
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

  const saveTemplate = async () => {
    try {
      await offersApi.createTemplate({ name: tplName.trim(), bodyHtml: tplBody, active: true })
      setTplName('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const createOffer = async () => {
    setError('')
    try {
      await offersApi.createOffer({
        templateId: tplId === '' ? undefined : (tplId as number),
        candidateName: candName.trim(),
        departmentId: deptId === '' ? undefined : (deptId as number),
        designationId: desigId === '' ? undefined : (desigId as number),
        managerId: mgrId === '' ? undefined : (mgrId as number),
        joinDate: join || undefined,
        annualCtc: ctc ? Number(ctc) : undefined,
      })
      setCandName('')
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

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="Offers & templates">
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
          <AppTypography variant="subtitle1" fontWeight={700} gutterBottom>
            New offer
          </AppTypography>
          <Stack spacing={2}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Template</InputLabel>
              <Select label="Template" value={tplId} onChange={(e) => setTplId(e.target.value === '' ? '' : Number(e.target.value))}>
                <MenuItem value="">(none)</MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <AppTextField label="Candidate name" value={candName} onChange={(e) => setCandName(e.target.value)} />
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
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <AppTextField
                label="Join date"
                type="date"
                value={join}
                onChange={(e) => setJoin(e.target.value)}
                InputLabelProps={{ shrink: true }}
                  size="small"
              />
              <AppTextField label="Annual CTC" type="number" value={ctc} onChange={(e) => setCtc(e.target.value)} size="small" />
            </Stack>
            <AppButton variant="contained" onClick={createOffer} disabled={!candName.trim()}>
              Create offer
            </AppButton>
          </Stack>
        </Paper>
      )}

      {tab === 'offers' && (
        <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
            <AppTypography variant="subtitle1" fontWeight={700}>
              Offers
            </AppTypography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Join</TableCell>
                <TableCell>CTC</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.candidateName}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell>{o.joinDate ?? '—'}</TableCell>
                  <TableCell>{o.annualCtc ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                      <AppButton
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          offersApi
                            .send(o.id)
                            .then(load)
                            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
                        }
                      >
                        Send
                      </AppButton>
                      <AppButton size="small" variant="outlined" onClick={() => downloadPdf(o.id)}>
                        PDF
                      </AppButton>
                      <AppButton
                        size="small"
                        variant="contained"
                        onClick={() =>
                          offersApi
                            .accept(o.id)
                            .then(load)
                            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
                        }
                      >
                        Accept
                      </AppButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </PageLayout>
  )
}
