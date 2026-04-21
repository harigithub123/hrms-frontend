import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Box, Chip } from '@mui/material'
import type { LeaveRequest } from '../../types/hrms'
import { AppButton } from '../../components/ui'

function statusChip(status: LeaveRequest['status']) {
  const map = {
    PENDING: 'warning' as const,
    APPROVED: 'success' as const,
    REJECTED: 'error' as const,
  }
  return <Chip size="small" label={status} color={map[status]} variant="outlined" />
}

export function getLeaveApprovalsColumnDefs(
  onApprove: (id: number) => void,
  onReject: (id: number) => void,
): ColDef<LeaveRequest>[] {
  return [
    { headerName: 'Employee', field: 'employeeName', flex: 1 },
    { headerName: 'Type', field: 'leaveTypeCode', width: 120, maxWidth: 160 },
    {
      headerName: 'Dates',
      colId: 'dateRange',
      flex: 1,
      valueGetter: (p) => `${p.data?.startDate ?? ''} → ${p.data?.endDate ?? ''}`,
      sortable: true,
      filter: true,
    },
    { headerName: 'Days', field: 'totalDays', width: 90, maxWidth: 120 },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      maxWidth: 140,
      cellRenderer: (params: ICellRendererParams<LeaveRequest>) =>
        params.data ? statusChip(params.data.status) : null,
    },
    {
      headerName: 'Actions',
      colId: '__leave_approval_actions__',
      sortable: false,
      filter: false,
      width: 220,
      maxWidth: 260,
      cellRenderer: (params: ICellRendererParams<LeaveRequest>) => {
        if (!params.data) return null
        if (params.data.status !== 'PENDING') {
          return <Box sx={{ color: 'text.secondary', fontSize: 13 }}>—</Box>
        }
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            <AppButton size="small" variant="contained" color="success" onClick={() => onApprove(params.data!.id)}>
              Approve
            </AppButton>
            <AppButton size="small" color="error" onClick={() => onReject(params.data!.id)}>
              Reject
            </AppButton>
          </Box>
        )
      },
    },
  ]
}
