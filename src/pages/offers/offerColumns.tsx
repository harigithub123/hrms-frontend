import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Box, Menu, MenuItem } from '@mui/material'
import { useMemo, useState } from 'react'
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

function OfferActionsCell({ row, actions }: { row: JobOffer; actions: OfferRowActions }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const canRelease = row.status === 'DRAFT' || row.status === 'SENT'
  const canResend = row.status === 'SENT'
  const canAccept = row.status === 'SENT' || row.status === 'DRAFT'
  const canReject = row.status !== 'JOINED' && row.status !== 'REJECTED'
  const canJoin = row.status === 'ACCEPTED'

  const items = useMemo(
    () => [
      { key: 'pdf', label: 'Download PDF', enabled: true, onClick: () => actions.onDownloadPdf(row) },
      { key: 'release', label: 'Release', enabled: canRelease, onClick: () => actions.onRelease(row) },
      { key: 'resend', label: 'Resend', enabled: canResend, onClick: () => actions.onResend(row) },
      { key: 'accept', label: 'Accept', enabled: canAccept, onClick: () => actions.onAccept(row) },
      { key: 'reject', label: 'Reject', enabled: canReject, onClick: () => actions.onReject(row) },
      { key: 'joined', label: 'Mark joined', enabled: canJoin, onClick: () => actions.onJoin(row) },
    ],
    [actions, row, canAccept, canJoin, canReject, canRelease, canResend],
  )

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <AppButton
        size="small"
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-controls={open ? 'offer-actions-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        Actions
      </AppButton>
      <Menu
        id="offer-actions-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {items.map((it) => (
          <MenuItem
            key={it.key}
            disabled={!it.enabled}
            onClick={() => {
              setAnchorEl(null)
              it.onClick()
            }}
          >
            {it.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}

function statusLabel(s: JobOfferStatus) {
  return s
}

function val(v: unknown) {
  return v == null || v === '' ? '—' : String(v)
}

export function getOfferColumnDefs(actions: OfferRowActions): ColDef<JobOffer>[] {
  return [
    { headerName: 'Candidate', field: 'candidateName', minWidth: 180 },
    { headerName: 'Email', field: 'candidateEmail', minWidth: 220, valueFormatter: (p) => val(p.value) },
    { headerName: 'Mobile', field: 'candidateMobile', minWidth: 140, valueFormatter: (p) => val(p.value) },
    { headerName: 'Type', field: 'employeeType', minWidth: 140, valueFormatter: (p) => val(p.value) },
    { headerName: 'Status', field: 'status', minWidth: 120, valueFormatter: (p) => statusLabel(p.value as JobOfferStatus) },
    { headerName: 'Department', field: 'departmentName', minWidth: 160, valueFormatter: (p) => val(p.value) },
    { headerName: 'Designation', field: 'designationName', minWidth: 160, valueFormatter: (p) => val(p.value) },
    { headerName: 'Join date', field: 'joiningDate', minWidth: 130, valueFormatter: (p) => val(p.value) },
    { headerName: 'CTC', field: 'annualCtc', minWidth: 120, valueFormatter: (p) => val(p.value) },
    { headerName: 'Release date', field: 'offerReleaseDate', minWidth: 130, valueFormatter: (p) => val(p.value) },
    {
      headerName: 'Actions',
      colId: '__offer_actions__',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      width: 150,
      cellRenderer: (p: ICellRendererParams<JobOffer>) => {
        const row = p.data
        if (!row) return null
        return <OfferActionsCell row={row} actions={actions} />
      },
    },
  ]
}

