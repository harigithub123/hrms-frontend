import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, IconButton, Menu, MenuItem } from '@mui/material'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { onboardingApi, separationBoardApi } from '../api/client'
import type { OnboardingCase, OnboardingTask, OnboardingTaskStatus } from '../types/hrms'
import { formatEmploymentStatus } from '../types/org'
import { AppButton, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'
import { DataGrid } from '../components/shared'
import type { GridQueryParams, GridQueryResult } from '../components/shared'
import { OnboardingCaseTasksDialog } from './OnboardingPage'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed'
}

type SeparationMenuParams = {
  onEmployeeDetails: (c: OnboardingCase) => void
}

function SeparationMenuCell(
  params: ICellRendererParams<OnboardingCase, unknown, SeparationMenuParams>,
) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const c = params.data
  const menuParams = (params.colDef?.cellRendererParams ?? {}) as SeparationMenuParams
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
          View employee in Employees
        </MenuItem>
      </Menu>
    </Box>
  )
}

function getSeparationColumnDefs(menuParams: SeparationMenuParams): ColDef<OnboardingCase>[] {
  return [
    {
      headerName: 'Employee',
      colId: 'candidateName',
      valueGetter: (p) =>
        `${p.data?.candidateFirstName ?? ''} ${p.data?.candidateLastName ?? ''}`.trim(),
      flex: 1.2,
      minWidth: 160,
    },
    {
      headerName: 'Employment status',
      field: 'employeeEmploymentStatus',
      maxWidth: 170,
      valueFormatter: (p) => formatEmploymentStatus(p.value),
    },
    { headerName: 'Case', field: 'status', maxWidth: 140 },
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
      colId: '__separation_menu__',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      width: 52,
      cellRenderer: SeparationMenuCell,
      cellRendererParams: menuParams,
    },
  ]
}

export default function SeparationBoardPage() {
  const [cases, setCases] = useState<OnboardingCase[]>([])
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const [tasksCaseId, setTasksCaseId] = useState<number | null>(null)
  const [newTaskNameByCase, setNewTaskNameByCase] = useState<Record<number, string>>({})

  const tasksCase = useMemo(() => cases.find((c) => c.id === tasksCaseId) ?? null, [cases, tasksCaseId])

  const load = useCallback(() => {
    return separationBoardApi
      .list()
      .then((list) => {
        setCases(list)
        setError('')
        setRefreshToken((t) => t + 1)
      })
      .catch((err) => setError(toErrorMessage(err)))
      .finally(() => setInitialLoadDone(true))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fetchRows = useCallback(
    async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<OnboardingCase>> => {
      const start = page * pageSize
      return {
        rows: cases.slice(start, start + pageSize),
        totalRows: cases.length,
      }
    },
    [cases],
  )

  const openEmployee = useCallback((_c: OnboardingCase) => {
    window.location.assign('/employees')
  }, [])

  const columnDefs = useMemo(
    () => getSeparationColumnDefs({ onEmployeeDetails: openEmployee }),
    [openEmployee],
  )

  const syncCases = async () => {
    setSyncing(true)
    setError('')
    try {
      const list = await separationBoardApi.sync()
      setCases(list)
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setSyncing(false)
    }
  }

  const toggleTask = async (caseId: number, taskId: number, done: boolean) => {
    try {
      await onboardingApi.toggleTask(caseId, taskId, done)
      await load()
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  const setTaskStatus = async (caseId: number, taskId: number, status: OnboardingTaskStatus) => {
    try {
      await onboardingApi.updateTask(caseId, taskId, { status })
      await load()
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
      await load()
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  const saveTaskName = async (c: OnboardingCase, t: OnboardingTask, draft: string) => {
    const next = draft.trim()
    if (next === '' || next === t.name) return
    try {
      await onboardingApi.updateTask(c.id, t.id, { name: next })
      await load()
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
      await load()
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  const noOpComplete = async (_id: number) => {}

  if (!initialLoadDone) return <LoadingSpinner />

  return (
    <PageLayout
      title="Separation & exit letters"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <AppButton component={Link} to="/" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="outlined" onClick={() => void load()} disabled={syncing}>
            Refresh
          </AppButton>
          <AppButton variant="contained" onClick={() => void syncCases()} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Create missing cases & tasks'}
          </AppButton>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Resigned and exited employees with an onboarding case appear here. Default tasks include relieving letter,
        experience letter, and full &amp; final letter. Use &quot;Create missing cases &amp; tasks&quot; for staff who
        have no case yet.
      </AppTypography>

      <DataGrid<OnboardingCase>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        refreshToken={refreshToken}
        onRowClicked={(row) => setTasksCaseId(row.id)}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 220px)"
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
        onComplete={noOpComplete}
        showCompleteCaseAction={false}
      />
    </PageLayout>
  )
}
