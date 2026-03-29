import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material'
import { rolesApi, usersApi } from '../api/client'
import type { RoleInfo, UserSummary } from '../types/hrms'
import { AppButton, AppTypography, LoadingSpinner, PageLayout } from '../components/ui'

const ROLE_EMPLOYEE = 'ROLE_EMPLOYEE'

export default function UserRolesPage() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [allRoles, setAllRoles] = useState<RoleInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserSummary | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([usersApi.list(), rolesApi.list()])
      .then(([u, r]) => {
        setUsers(u)
        setAllRoles(r)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (row: UserSummary) => {
    setEditing(row)
    const next: Record<string, boolean> = {}
    for (const role of allRoles) {
      next[role.name] = row.roles?.includes(role.name) ?? false
    }
    setSelected(next)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setEditing(null)
  }

  const toggle = (name: string) => {
    setSelected((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setError('')
    const roles = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([name]) => name)
    try {
      await usersApi.updateRoles(editing.id, roles)
      close()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout title="User roles" maxWidth="none">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each employee gets a login with <strong>{ROLE_EMPLOYEE}</strong> when their employee record is created. Use
        this screen to grant <strong>HR</strong> or other roles. Employee-linked accounts always keep{' '}
        {ROLE_EMPLOYEE} (enforced on save).
      </AppTypography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Employee ID</TableCell>
            <TableCell>Roles</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.employeeId ?? '—'}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(u.roles ?? []).map((r) => (
                    <Chip key={r} label={r.replace(/^ROLE_/, '')} size="small" variant="outlined" />
                  ))}
                </Box>
              </TableCell>
              <TableCell align="right">
                <AppButton size="small" variant="outlined" onClick={() => openEdit(u)}>
                  Edit roles
                </AppButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Roles for {editing?.username}</DialogTitle>
        <DialogContent>
          <FormGroup>
            {allRoles.map((role) => {
              const lockedEmployee =
                editing?.employeeId != null && role.name === ROLE_EMPLOYEE
              return (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={lockedEmployee ? true : !!selected[role.name]}
                      disabled={lockedEmployee}
                      onChange={() => {
                        if (!lockedEmployee) toggle(role.name)
                      }}
                    />
                  }
                  label={
                    lockedEmployee
                      ? `${role.name} (required for employee login)`
                      : role.name
                  }
                />
              )
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <AppButton onClick={close}>Cancel</AppButton>
          <AppButton variant="contained" onClick={handleSave} disabled={saving}>
            Save
          </AppButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  )
}
