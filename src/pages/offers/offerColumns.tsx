import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Box, Stack } from '@mui/material'
import type { JobOffer, JobOfferStatus } from '../../types/hrms'
import { AppButton } from '../../components/ui'

export type OfferRowActions = {
  onRelease: (row: JobOffer) => void
  onResend: (row: JobOffer) => void
  onDownloadPdf: (row: JobOffer) => void
  onAccept: (row: JobOffer) => void
  onReject: (row: JobOffer) => void
  onJoin: (row: JobOffer) => void
}

function statusLabel(s: JobOfferStatus) {
  return s
}

function val(v: unknown) {
  return v == null || v === '' ? '—' : String(v)
}

export function getOfferColumnDefs(actions: OfferRowActions): ColDef<JobOffer>[] {
  return [
    { headerName: 'ID', field: 'id', width: 90, flex: 0, filter: false },
    { headerName: 'Candidate', field: 'candidateName', minWidth: 180 },
    { headerName: 'Email', field: 'candidateEmail', minWidth: 220, valueFormatter: (p) => val(p.value) },
    { headerName: 'Mobile', field: 'candidateMobile', minWidth: 140, valueFormatter: (p) => val(p.value) },
    { headerName: 'Type', field: 'employeeType', minWidth: 140, valueFormatter: (p) => val(p.value) },
    { headerName: 'Status', field: 'status', minWidth: 120, valueFormatter: (p) => statusLabel(p.value as JobOfferStatus) },
    { headerName: 'Department', field: 'departmentName', minWidth: 160, valueFormatter: (p) => val(p.value) },
    { headerName: 'Designation', field: 'designationName', minWidth: 160, valueFormatter: (p) => val(p.value) },
    { headerName: 'Join date', field: 'joinDate', minWidth: 130, valueFormatter: (p) => val(p.value) },
    { headerName: 'CTC', field: 'annualCtc', minWidth: 120, valueFormatter: (p) => val(p.value) },
    { headerName: 'Release date', field: 'offerReleaseDate', minWidth: 130, valueFormatter: (p) => val(p.value) },
    {
      headerName: 'Email',
      field: 'lastEmailStatus',
      minWidth: 110,
      valueFormatter: (p) => val(p.value),
    },
    {
      headerName: 'Actions',
      colId: '__offer_actions__',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      width: 520,
      cellRenderer: (p: ICellRendererParams<JobOffer>) => {
        const row = p.data
        if (!row) return null

        const canRelease = row.status === 'DRAFT' || row.status === 'SENT'
        const canAccept = row.status === 'SENT' || row.status === 'DRAFT'
        const canReject = row.status !== 'JOINED' && row.status !== 'REJECTED'
        const canJoin = row.status === 'ACCEPTED'

        return (
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end">
              <AppButton size="small" variant="outlined" onClick={() => actions.onDownloadPdf(row)}>
                PDF
              </AppButton>
              <AppButton size="small" variant="outlined" onClick={() => actions.onRelease(row)} disabled={!canRelease}>
                Release
              </AppButton>
              <AppButton size="small" variant="outlined" onClick={() => actions.onResend(row)} disabled={row.status !== 'SENT'}>
                Resend
              </AppButton>
              <AppButton size="small" variant="contained" onClick={() => actions.onAccept(row)} disabled={!canAccept}>
                Accept
              </AppButton>
              <AppButton size="small" color="error" variant="outlined" onClick={() => actions.onReject(row)} disabled={!canReject}>
                Reject
              </AppButton>
              <AppButton size="small" color="success" variant="contained" onClick={() => actions.onJoin(row)} disabled={!canJoin}>
                Joined
              </AppButton>
            </Stack>
          </Box>
        )
      },
    },
  ]
}

