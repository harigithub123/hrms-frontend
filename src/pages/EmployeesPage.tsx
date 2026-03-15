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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { employeesApi, departmentsApi, designationsApi } from '../api/client'
import type { Employee, EmployeeRequest, Department, Designation } from '../types/org'
import { AppButton, AppTextField, AppTypography, PageLayout, LoadingSpinner } from '../components/ui'
import { useFieldValidation } from '../hooks/useFieldValidation'

export default function EmployeesPage() {
  const [list, setList] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [submitError, setSubmitError] = useState('')

  const firstName = useFieldValidation('', { required: true, maxLength: 100 })
  const lastName = useFieldValidation('', { required: true, maxLength: 100 })
  const email = useFieldValidation('', { maxLength: 255 })
  const employeeCode = useFieldValidation('', { maxLength: 50 })
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [designationId, setDesignationId] = useState<number | ''>('')
  const [managerId, setManagerId] = useState<number | ''>('')
  const [joinedAt, setJoinedAt] = useState('')

  const load = () => {
    Promise.all([employeesApi.list(), departmentsApi.list(), designationsApi.list()])
      .then(([emp, dept, des]) => {
        setList(emp)
        setDepartments(dept)
        setDesignations(des)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    firstName.setValue('')
    lastName.setValue('')
    email.setValue('')
    employeeCode.setValue('')
    setDepartmentId('')
    setDesignationId('')
    setManagerId('')
    setJoinedAt('')
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = (row: Employee) => {
    setEditing(row)
    firstName.setValue(row.firstName)
    lastName.setValue(row.lastName)
    email.setValue(row.email ?? '')
    employeeCode.setValue(row.employeeCode ?? '')
    setDepartmentId(row.departmentId ?? '')
    setDesignationId(row.designationId ?? '')
    setManagerId(row.managerId ?? '')
    setJoinedAt(row.joinedAt ?? '')
    setSubmitError('')
    setOpen(true)
  }

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    setSubmitError('')
    const fErr = firstName.validate()
    const lErr = lastName.validate()
    if (fErr || lErr) return
    const body: EmployeeRequest = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim() || undefined,
      employeeCode: employeeCode.value.trim() || undefined,
      departmentId: departmentId === '' ? undefined : (departmentId as number),
      designationId: designationId === '' ? undefined : (designationId as number),
      managerId: managerId === '' ? undefined : (managerId as number),
      joinedAt: joinedAt || undefined,
    }
    try {
      if (editing) await employeesApi.update(editing.id, body)
      else await employeesApi.create(body)
      close()
      load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this employee?')) return
    try {
      await employeesApi.delete(id)
      load()
    } catch {
      // ignore
    }
  }

  const managerOptions = list.filter((e) => !editing || e.id !== editing.id)

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout
      title="Employees"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">Back</AppButton>
          <AppButton variant="contained" onClick={openCreate}>Add employee</AppButton>
        </Box>
      }
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Designation</TableCell>
            <TableCell>Manager</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.firstName} {row.lastName}</TableCell>
              <TableCell>{row.employeeCode ?? '—'}</TableCell>
              <TableCell>{row.departmentName ?? '—'}</TableCell>
              <TableCell>{row.designationName ?? '—'}</TableCell>
              <TableCell>{row.managerName ?? '—'}</TableCell>
              <TableCell align="right">
                <AppButton size="small" onClick={() => openEdit(row)}>Edit</AppButton>
                <AppButton size="small" color="error" onClick={() => handleDelete(row.id)}>Delete</AppButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit employee' : 'Add employee'}</DialogTitle>
        <DialogContent>
          {submitError && <AppTypography color="error" variant="body2" sx={{ mb: 1 }}>{submitError}</AppTypography>}
          <AppTextField label="First name" value={firstName.value} onChange={firstName.onChange} onBlur={firstName.onBlur} error={!!firstName.error} helperText={firstName.error} margin="dense" required />
          <AppTextField label="Last name" value={lastName.value} onChange={lastName.onChange} onBlur={lastName.onBlur} error={!!lastName.error} helperText={lastName.error} margin="dense" required />
          <AppTextField label="Email" type="email" value={email.value} onChange={email.onChange} onBlur={email.onBlur} error={!!email.error} helperText={email.error} margin="dense" />
          <AppTextField label="Employee code" value={employeeCode.value} onChange={employeeCode.onChange} onBlur={employeeCode.onBlur} error={!!employeeCode.error} helperText={employeeCode.error} margin="dense" />
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Department</InputLabel>
            <Select value={departmentId} label="Department" onChange={(e) => setDepartmentId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Designation</InputLabel>
            <Select value={designationId} label="Designation" onChange={(e) => setDesignationId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {designations.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Manager</InputLabel>
            <Select value={managerId} label="Manager" onChange={(e) => setManagerId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {managerOptions.map((m) => <MenuItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</MenuItem>)}
            </Select>
          </FormControl>
          <AppTextField label="Joined date" type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} margin="dense" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={close}>Cancel</AppButton>
          <AppButton variant="contained" onClick={handleSubmit}>Save</AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
