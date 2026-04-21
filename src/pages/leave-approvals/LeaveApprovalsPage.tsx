import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box } from '@mui/material'
import { leaveRequestsApi, meApi } from '../../api/client'
import type { LeaveRequest } from '../../types/hrms'
import type { Employee } from '../../types/org'
import { AppTypography, PageLayout } from '../../components/ui'
import { DataGrid, type GridQueryParams } from '../../components/shared'
import { applyLeaveApprovalsGridQuery } from './leaveApprovalsGridQuery'
import { getLeaveApprovalsColumnDefs } from './leaveApprovalsColumns'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function LeaveApprovalsPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [reportees, setReportees] = useState<Employee[]>([])
  const [list, setList] = useState<LeaveRequest[]>([])
  const [listLoadError, setListLoadError] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [listLoaded, setListLoaded] = useState(false)

  const reporteeIds = useMemo(() => new Set(reportees.map((e) => e.id)), [reportees])

  const load = useCallback(async () => {
    setListLoaded(false)
    try {
      const [team, all] = await Promise.all([meApi.directReports(), leaveRequestsApi.list()])
      setReportees(Array.isArray(team) ? team : [])
      const ids = new Set((Array.isArray(team) ? team : []).map((e) => e.id))
      const filtered = (Array.isArray(all) ? all : []).filter((r) => ids.has(r.employeeId))
      setList(filtered)
      setListLoadError('')
    } catch (e) {
      setListLoadError(e instanceof Error ? e.message : 'Failed to load')
      setList([])
    } finally {
      setListLoaded(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  const decide = useCallback(
    async (id: number, approve: boolean) => {
      setFeedbackMsg('')
      try {
        await leaveRequestsApi.decide(id, { approve, comment: null })
        setFeedbackMsg(approve ? 'Approved' : 'Rejected')
        setRefreshToken((t) => t + 1)
      } catch (e) {
        setFeedbackMsg(e instanceof Error ? e.message : 'Failed')
      }
    },
    [],
  )

  const onApprove = useCallback((id: number) => void decide(id, true), [decide])
  const onReject = useCallback((id: number) => void decide(id, false), [decide])

  const fetchRows = useCallback(
    async (params: GridQueryParams) => {
      if (listLoadError) throw new Error(listLoadError)
      return applyLeaveApprovalsGridQuery(list, params)
    },
    [list, listLoadError],
  )

  const columnDefs = useMemo(
    () => getLeaveApprovalsColumnDefs(onApprove, onReject),
    [onApprove, onReject],
  )

  return (
    <PageLayout maxWidth="none">
      {listLoaded && reporteeIds.size === 0 && !listLoadError && (
        <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You have no direct reports, so there are no team leave requests to show here.
        </AppTypography>
      )}
      {feedbackMsg && (
        <AppTypography
          variant="body2"
          sx={{ mb: 1 }}
          color={feedbackMsg.includes('Failed') ? 'error' : 'text.secondary'}
        >
          {feedbackMsg}
        </AppTypography>
      )}
      <Box sx={{ mb: 2 }}>
        <DataGrid<LeaveRequest>
          columnDefs={columnDefs}
          fetchRows={fetchRows}
          getRowId={(row) => String(row.id)}
          refreshToken={refreshToken}
          defaultPageSize={10}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          height="calc(100svh - 200px)"
        />
      </Box>
    </PageLayout>
  )
}
