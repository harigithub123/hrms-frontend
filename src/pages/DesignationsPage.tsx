import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { designationsApi } from '../api/client'
import type { Designation, DesignationRequest } from '../types/org'
import { AppButton, AppTextField, AppTypography, PageLayout, LoadingSpinner } from '../components/ui'
import { useFieldValidation } from '../hooks/useFieldValidation'

export default function DesignationsPage() {
  const [list, setList] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [submitError, setSubmitError] = useState('')

  const name = useFieldValidation('', { required: true, maxLength: 150 })
  const code = useFieldValidation('', { maxLength: 50 })

  const load = () => designationsApi.list().then(setList).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    name.setValue('')
    code.setValue('')
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = (row: Designation) => {
    setEditing(row)
    name.setValue(row.name)
    code.setValue(row.code ?? '')
    setSubmitError('')
    setOpen(true)
  }

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    setSubmitError('')
    const nameErr = name.validate()
    if (nameErr) return
    const body: DesignationRequest = { name: name.value.trim(), code: code.value.trim() || undefined }
    try {
      if (editing) await designationsApi.update(editing.id, body)
      else await designationsApi.create(body)
      close()
      load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this designation?')) return
    try {
      await designationsApi.delete(id)
      load()
    } catch {
      // ignore
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Designations"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">Back</AppButton>
          <AppButton variant="contained" onClick={openCreate}>Add designation</AppButton>
        </Box>
      }
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.code ?? '—'}</TableCell>
              <TableCell align="right">
                <AppButton size="small" onClick={() => openEdit(row)}>Edit</AppButton>
                <AppButton size="small" color="error" onClick={() => handleDelete(row.id)}>Delete</AppButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit designation' : 'Add designation'}</DialogTitle>
        <DialogContent>
          {submitError && <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>{submitError}</AppTypography>}
          <AppTextField label="Name" value={name.value} onChange={name.onChange} onBlur={name.onBlur} error={!!name.error} helperText={name.error} margin="dense" required />
          <AppTextField label="Code" value={code.value} onChange={code.onChange} onBlur={code.onBlur} error={!!code.error} helperText={code.error} margin="dense" />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={close}>Cancel</AppButton>
          <AppButton variant="contained" onClick={handleSubmit}>Save</AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
