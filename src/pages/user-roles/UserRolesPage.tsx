import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { rolesApi, usersApi } from '../../api/client'
import type { RoleInfo, UserSummary } from '../../types/hrms'
import { AppButton, AppTypography, PageLayout } from '../../components/ui'
import {
  CommonInputForm,
  DataGrid,
  type DataGridActionConfig,
  type GridQueryParams,
} from '../../components/shared'
import { getUserRolesColumnDefs } from './userRolesColumns'
import {
  EMPTY_USER_ROLES_FORM,
  USER_ROLES_FORM_CONFIG,
  type UserRolesFormValues,
} from './userRolesFormConfig'
import { applyUserRolesGridQuery } from './userRolesGridQuery'

const ROLE_EMPLOYEE = 'ROLE_EMPLOYEE'
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function UserRolesPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [allUsers, setAllUsers] = useState<UserSummary[]>([])
  const [allRoles, setAllRoles] = useState<RoleInfo[]>([])
  const [listLoadError, setListLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserSummary | null>(null)
  const [formValues, setFormValues] = useState<UserRolesFormValues>(EMPTY_USER_ROLES_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserRolesFormValues, string>>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([usersApi.list(), rolesApi.list()])
      setAllUsers(u)
      setAllRoles(r)
      setListLoadError('')
    } catch (e) {
      setListLoadError(e instanceof Error ? e.message : 'Failed to load')
      setAllUsers([])
      setAllRoles([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  const fetchRows = useCallback(
    async (params: GridQueryParams) => {
      if (listLoadError) throw new Error(listLoadError)
      return applyUserRolesGridQuery(allUsers, params)
    },
    [allUsers, listLoadError],
  )

  const validateForm = useCallback(() => {
    return {} as Partial<Record<keyof UserRolesFormValues, string>>
  }, [])

  const handleFieldChange = useCallback((name: keyof UserRolesFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback((_name: keyof UserRolesFormValues) => {}, [])

  const openEdit = useCallback(
    (row: UserSummary) => {
      setEditing(row)
      setFormValues({
        username: row.username,
        employeeId: row.employeeId != null ? String(row.employeeId) : '—',
      })
      setFormErrors({})
      setSubmitError('')
      const next: Record<string, boolean> = {}
      for (const role of allRoles) {
        next[role.name] = row.roles?.includes(role.name) ?? false
      }
      setSelected(next)
      setOpen(true)
    },
    [allRoles],
  )

  const close = () => {
    setOpen(false)
    setEditing(null)
  }

  const toggle = (name: string) => {
    setSelected((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleSubmit = async () => {
    if (!editing) return
    setSubmitError('')
    const errors = validateForm()
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    setSaving(true)
    const roles = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([name]) => name)
    try {
      await usersApi.updateRoles(editing.id, roles)
      close()
      setRefreshToken((t) => t + 1)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const actionConfig: DataGridActionConfig<UserSummary> = useMemo(
    () => ({ onEdit: openEdit }),
    [openEdit],
  )

  const columnDefs = useMemo(() => getUserRolesColumnDefs(), [])

  const rolePicker = (
    <FormGroup sx={{ mt: 1 }}>
      {allRoles.map((role) => {
        const lockedEmployee = editing?.employeeId != null && role.name === ROLE_EMPLOYEE
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
  )

  return (
    <PageLayout
      title="User roles"
      maxWidth="none"
      actions={
        <AppButton component={Link} to="/admin" variant="outlined">
          Back
        </AppButton>
      }
    >
      <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each employee gets a login with <strong>{ROLE_EMPLOYEE}</strong> when their employee record is created. Use
        this screen to grant <strong>HR</strong> or other roles. Employee-linked accounts always keep{' '}
        {ROLE_EMPLOYEE} (enforced on save).
      </AppTypography>

      <DataGrid<UserSummary>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 220px)"
      />

      <CommonInputForm<UserRolesFormValues>
        open={open}
        title={editing ? `Roles for ${editing.username}` : 'Roles'}
        fields={USER_ROLES_FORM_CONFIG}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={close}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submitDisabled={saving}
        extraContent={rolePicker}
      />
    </PageLayout>
  )
}
