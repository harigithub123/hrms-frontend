import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, IconButton, TablePagination, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import type {
  ColDef,
  ColumnState,
  FilterChangedEvent,
  FilterModel,
  GetRowIdParams,
  ICellRendererParams,
  SortChangedEvent,
  SortModelItem,
} from 'ag-grid-community'
import { AppTypography } from '../ui'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

const globalAgGrid = globalThis as typeof globalThis & { __agGridModulesRegistered?: boolean }
if (!globalAgGrid.__agGridModulesRegistered) {
  ModuleRegistry.registerModules([AllCommunityModule])
  globalAgGrid.__agGridModulesRegistered = true
}

export type GridQueryParams = {
  page: number
  pageSize: number
  sortModel: SortModelItem[]
  filterModel: FilterModel
}

export type GridQueryResult<T> = {
  rows: T[]
  totalRows: number
}

export type DataGridActionConfig<T> = {
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onRefresh?: (row: T) => void
  /** Payroll / bank details (e.g. employees grid). */
  onPayrollBank?: (row: T) => void
}

type ActionCellRendererParams<T> = {
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onRefresh?: (row: T) => void
  onPayrollBank?: (row: T) => void
}

function ActionsCellRenderer<T extends object>(
  params: ICellRendererParams<T, unknown, unknown> & { colDef: ColDef<T> },
) {
  if (!params.data) return null

  const rendererParams = (params.colDef.cellRendererParams ?? {}) as ActionCellRendererParams<T>
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, height: '100%' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {rendererParams.onEdit && (
        <Tooltip title="Edit">
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation()
              rendererParams.onEdit?.(params.data!)
            }}
            aria-label="Edit"
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {rendererParams.onDelete && (
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation()
              rendererParams.onDelete?.(params.data!)
            }}
            aria-label="Delete"
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {rendererParams.onRefresh && (
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation()
              rendererParams.onRefresh?.(params.data!)
            }}
            aria-label="Refresh"
          >
            <RefreshRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {rendererParams.onPayrollBank && (
        <Tooltip title="Payroll bank">
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation()
              rendererParams.onPayrollBank?.(params.data!)
            }}
            aria-label="Payroll bank"
          >
            <AccountBalanceWalletOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

type DataGridProps<T extends object> = {
  columnDefs: ColDef<T>[]
  fetchRows: (params: GridQueryParams) => Promise<GridQueryResult<T>>
  getRowId: (row: T) => string
  actionConfig?: DataGridActionConfig<T>
  /** Opens case/detail flows from the row; rows use a pointer cursor when set. */
  onRowClicked?: (row: T) => void
  refreshToken?: number
  defaultPageSize?: number
  pageSizeOptions?: number[]
  height?: number | string
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export function DataGrid<T extends object>({
  columnDefs,
  fetchRows,
  getRowId,
  actionConfig,
  onRowClicked,
  refreshToken,
  defaultPageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  height = 480,
}: DataGridProps<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize)
  const [sortModel, setSortModel] = useState<SortModelItem[]>([])
  const [filterModel, setFilterModel] = useState<FilterModel>({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const handleDeleteClick = useCallback(
    (row: T) => {
      actionConfig?.onDelete?.(row)
    },
    [actionConfig],
  )

  const finalColumnDefs = useMemo<ColDef<T>[]>(() => {
    if (!actionConfig) return columnDefs

    const hasActions =
      actionConfig.onEdit != null ||
      actionConfig.onDelete != null ||
      actionConfig.onRefresh != null ||
      actionConfig.onPayrollBank != null
    if (!hasActions) return columnDefs

    const actionCount = [
      actionConfig.onEdit,
      actionConfig.onDelete,
      actionConfig.onRefresh,
      actionConfig.onPayrollBank,
    ].filter(Boolean).length

    const hasActionsColumn = columnDefs.some((columnDef) => columnDef.colId === '__actions__')
    if (hasActionsColumn) return columnDefs

    const actionsCol: ColDef<T> = {
      headerName: 'Actions',
      colId: '__actions__',
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
      width: 50 + actionCount * 35,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: ActionsCellRenderer,
      cellRendererParams: {
        onEdit: actionConfig.onEdit,
        onDelete: actionConfig.onDelete ? (row: T) => handleDeleteClick(row) : undefined,
        onRefresh: actionConfig.onRefresh,
        onPayrollBank: actionConfig.onPayrollBank,
      } as ActionCellRendererParams<T>,
    }

    return [...columnDefs, actionsCol]
  }, [columnDefs, actionConfig, handleDeleteClick])

  useEffect(() => {
    setRowsPerPage(defaultPageSize)
  }, [defaultPageSize])

  useEffect(() => {
    let isActive = true
    const loadRows = async () => {
      setLoading(true)
      setErrorMessage('')
      try {
        const result = await fetchRows({ page, pageSize: rowsPerPage, sortModel, filterModel })
        if (!isActive) return
        setRows(result.rows)
        setTotalRows(result.totalRows)
      } catch (error) {
        if (!isActive) return
        setRows([])
        setTotalRows(0)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    void loadRows()
    return () => {
      isActive = false
    }
  }, [fetchRows, page, rowsPerPage, sortModel, filterModel, refreshToken])

  const handleSortChanged = (event: SortChangedEvent<T>) => {
    const nextSortModel: SortModelItem[] = event.api
      .getColumnState()
      .filter(
        (col: ColumnState): col is ColumnState & { sort: 'asc' | 'desc' } =>
          col.sort === 'asc' || col.sort === 'desc',
      )
      .map((col) => ({ colId: col.colId, sort: col.sort }))
    setSortModel(nextSortModel)
    setPage(0)
  }

  const handleFilterChanged = (event: FilterChangedEvent<T>) => {
    setFilterModel(event.api.getFilterModel())
    setPage(0)
  }

  return (
    <Box
      sx={(theme) => ({
        height,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        boxShadow: `0 14px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.32 : 0.09)}`,
      })}
    >
      {errorMessage && (
        <AppTypography color="error" variant="body2" sx={{ px: 2, pt: 1.5 }}>
          {errorMessage}
        </AppTypography>
      )}
      <Box
        className="ag-theme-quartz"
        sx={(theme) => ({
          '--ag-font-size': '13px',
          '--ag-font-family': '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          '--ag-foreground-color': theme.palette.text.primary,
          '--ag-background-color': theme.palette.background.paper,
          '--ag-border-color': theme.palette.divider,
          '--ag-row-border-color': theme.palette.divider,
          '--ag-header-background-color': theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.04)
            : '#f8fafc',
          '--ag-header-foreground-color': theme.palette.text.primary,
          '--ag-odd-row-background-color': theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.01)
            : '#fcfcfd',
          '--ag-row-hover-color': theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.light, 0.18)
            : '#eaf4ff',
          '--ag-selected-row-background-color': theme.palette.mode === 'dark'
            ? alpha(theme.palette.primary.light, 0.25)
            : '#dcedff',
          '--ag-input-border-color': theme.palette.divider,
          '--ag-input-focus-border-color': theme.palette.primary.main,
          '--ag-chip-background-color': alpha(theme.palette.primary.main, 0.12),
          '--ag-chip-text-color': theme.palette.primary.main,
          '--ag-cell-horizontal-padding': '16px',
          '--ag-grid-size': '8px',
          flex: 1,
          minHeight: 0,
          width: '100%',
          '& .ag-root-wrapper': {
            border: 'none',
            borderRadius: 0,
          },
          '& .ag-header': {
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          '& .ag-header-cell': {
            fontWeight: 700,
            letterSpacing: '0.01em',
          },
          '& .ag-header-cell-label': {
            justifyContent: 'space-between',
          },
          '& .ag-row': {
            transition: 'background-color 160ms ease',
          },
          '& .ag-row.ag-row-hover': {
            boxShadow: `inset 3px 0 0 ${alpha(theme.palette.primary.main, 0.7)}`,
          },
          '& .ag-cell': {
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
          },
          '& .ag-cell-wrapper': {
            alignItems: 'center',
          },
          '& .ag-header-cell-text': {
            fontSize: '13px',
          },
          '& .ag-paging-panel': {
            borderTop: 'none',
          },
        })}
      >
        <AgGridReact<T>
          theme="legacy"
          rowData={rows}
          columnDefs={finalColumnDefs}
          getRowId={(params: GetRowIdParams<T>) => getRowId(params.data)}
          defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1, minWidth: 140 }}
          rowHeight={36}
          headerHeight={40}
          animateRows
          suppressCellFocus
          rowStyle={onRowClicked ? { cursor: 'pointer' } : undefined}
          onRowClicked={
            onRowClicked
              ? (e) => {
                  if (e.data) onRowClicked(e.data)
                }
              : undefined
          }
          onSortChanged={handleSortChanged}
          onFilterChanged={handleFilterChanged}
          loading={loading}
          noRowsOverlayComponentParams={{
            noRowsMessageFunc: () => (loading ? 'Loading data...' : 'No rows to show'),
          }}
        />
      </Box>
      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={pageSizeOptions}
        size="small"
        sx={(theme) => ({
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.02)
            : '#fafbfc',
          '.MuiTablePagination-toolbar': {
            minHeight: 40,
            height: 40,
            px: 1.5,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 0.75,
            width: '100%',
            overflow: 'hidden',
          },
          '.MuiTablePagination-toolbar > *': {
            flexShrink: 0,
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: 12,
            color: theme.palette.text.secondary,
            whiteSpace: 'nowrap',
          },
          '.MuiTablePagination-input': {
            marginRight: 1,
            flexShrink: 0,
          },
          '.MuiTablePagination-input .MuiInputBase-root': {
            height: 28,
          },
          '.MuiTablePagination-select': {
            py: 0.25,
            fontSize: 12,
          },
          '.MuiTablePagination-spacer': {
            display: 'none',
          },
          '.MuiTablePagination-selectLabel': {
            margin: 0,
          },
          '.MuiTablePagination-displayedRows': {
            margin: '0 8px 0 12px',
            minWidth: 72,
            textAlign: 'right',
          },
          '.MuiTablePagination-actions': {
            flexShrink: 0,
            marginLeft: 0,
            display: 'inline-flex',
            alignItems: 'center',
          },
          '.MuiTablePagination-actions button': {
            borderRadius: 1.5,
            padding: 4,
          },
        })}
      />
    </Box>
  )
}
