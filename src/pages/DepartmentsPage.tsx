import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { departmentsApi } from '../api/client'
import type { Department, DepartmentRequest } from '../types/org'
import { AppButton, AppTextField, AppTypography, PageLayout, LoadingSpinner } from '../components/ui'
import { useFieldValidation } from '../hooks/useFieldValidation'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function DepartmentsPage() {
  const [list, setList] = useState<Department[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [submitError, setSubmitError] = useState('')

  const name = useFieldValidation('', { required: true, maxLength: 150 })
  const code = useFieldValidation('', { maxLength: 50 })
  const description = useFieldValidation('', { maxLength: 500 })

  const load = () => {
    setLoading(true)
    departmentsApi.list(page, rowsPerPage)
      .then((paged) => {
        setList(paged.content)
        setTotalRows(paged.totalElements)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, rowsPerPage])

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage)
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const openCreate = () => {
    setEditing(null)
    name.setValue('')
    code.setValue('')
    description.setValue('')
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = (row: Department) => {
    setEditing(row)
    name.setValue(row.name)
    code.setValue(row.code ?? '')
    description.setValue(row.description ?? '')
    setSubmitError('')
    setOpen(true)
  }

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    setSubmitError('')
    const nameErr = name.validate()
    if (nameErr) return
    const body: DepartmentRequest = {
      name: name.value.trim(),
      code: code.value.trim() || null,
      description: description.value.trim() || null,
    }
    try {
      if (editing) await departmentsApi.update(editing.id, body)
      else await departmentsApi.create(body)
      close()
      load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this department?')) return
    try {
      await departmentsApi.delete(id)
      load()
    } catch {
      // ignore
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Departments"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">Back</AppButton>
          <AppButton variant="contained" onClick={openCreate}>Add department</AppButton>
        </Box>
      }
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.code ?? '—'}</TableCell>
              <TableCell>{row.description ?? '—'}</TableCell>
              <TableCell align="right">
                <AppButton size="small" onClick={() => openEdit(row)}>Edit</AppButton>
                <AppButton size="small" color="error" onClick={() => handleDelete(row.id)}>Delete</AppButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        size="small"
      />

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit department' : 'Add department'}</DialogTitle>
        <DialogContent>
          {submitError && <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>{submitError}</AppTypography>}
          <AppTextField label="Name" value={name.value} onChange={name.onChange} onBlur={name.onBlur} error={!!name.error} helperText={name.error} margin="dense" required />
          <AppTextField label="Code" value={code.value} onChange={code.onChange} onBlur={code.onBlur} error={!!code.error} helperText={code.error} margin="dense" />
          <AppTextField label="Description" value={description.value} onChange={description.onChange} onBlur={description.onBlur} error={!!description.error} helperText={description.error} margin="dense" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={close}>Cancel</AppButton>
          <AppButton variant="contained" onClick={handleSubmit}>Save</AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
