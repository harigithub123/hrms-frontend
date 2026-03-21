import { useEffect, useState } from 'react'
import { Alert, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { employeesApi, usersApi } from '../api/client'
import type { Employee } from '../types/org'
import type { UserSummary } from '../types/hrms'
import { AppButton, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

export default function UserLinkPage() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pick, setPick] = useState<Record<number, number | ''>>({})

  useEffect(() => {
    setLoading(true)
    Promise.all([usersApi.list(), employeesApi.listAll()])
      .then(([u, e]) => {
        setUsers(u)
        setEmployees(e)
        const m: Record<number, number | ''> = {}
        for (const x of u) {
          m[x.id] = x.employeeId ?? ''
        }
        setPick(m)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (userId: number) => {
    const emp = pick[userId]
    try {
      await usersApi.linkEmployee(userId, emp === '' ? null : emp)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Link a login user to an employee so they can use self-service leave and view payslips.
      </AppTypography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Employee</TableCell>
            <TableCell align="right">Save</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell>
              <TableCell>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    label="Employee"
                    value={pick[u.id] ?? ''}
                    onChange={(e) =>
                      setPick((prev) => ({ ...prev, [u.id]: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                  >
                    <MenuItem value="">— none —</MenuItem>
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell align="right">
                <AppButton variant="contained" onClick={() => save(u.id)}>
                  Save
                </AppButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageLayout>
  )
}
