import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { departmentsApi, designationsApi, employeesApi } from '../../api/client'
import type { Department, Designation, Employee, EmployeeRequest } from '../../types/org'
import { AppButton, PageLayout } from '../../components/ui'
import { CommonInputForm, DataGrid } from '../../components/shared'
import type { DataGridActionConfig, GridQueryParams, GridQueryResult } from '../../components/shared'
import { getEmployeeColumnDefs } from './employeeColumns'
import { EmployeePayrollBankDialog } from './EmployeePayrollBankDialog'
import {
  EMPTY_EMPLOYEE_FORM,
  EMPLOYEE_TEXT_RULES,
  getEmployeeFormFields,
} from './employeeFormConfig'
import type { EmployeeFormValues } from './employeeFormConfig'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

export default function EmployeesPage() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [formValues, setFormValues] = useState<EmployeeFormValues>(EMPTY_EMPLOYEE_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EmployeeFormValues, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [bankEmployee, setBankEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    Promise.all([departmentsApi.listAll(), designationsApi.listAll(), employeesApi.listAll()]).then(
      ([dept, des, allEmp]) => {
        setDepartments(dept)
        setDesignations(des)
        setAllEmployees(allEmp)
      },
    )
  }, [])

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.name })),
    [departments],
  )
  const designationOptions = useMemo(
    () => designations.map((d) => ({ value: String(d.id), label: d.name })),
    [designations],
  )

  const managerOptions = useMemo(() => {
    const list = editing ? allEmployees.filter((e) => e.id !== editing.id) : allEmployees
    return list.map((m) => ({
      value: String(m.id),
      label: `${m.firstName} ${m.lastName}`.trim(),
    }))
  }, [allEmployees, editing])

  const formFields = useMemo(
    () =>
      getEmployeeFormFields({
        departmentOptions,
        designationOptions,
        managerOptions,
      }),
    [departmentOptions, designationOptions, managerOptions],
  )

  const validateField = useCallback((name: keyof EmployeeFormValues, value: string): string => {
    const rule = EMPLOYEE_TEXT_RULES.find((r) => r.name === name)
    if (!rule) return ''
    const trimmed = value.trim()
    if (rule.required && !trimmed) return `${rule.label} is required`
    if (rule.maxLength && value.length > rule.maxLength) return `${rule.label} cannot exceed ${rule.maxLength} characters`
    return ''
  }, [])

  const validateForm = useCallback(
    (values: EmployeeFormValues) => {
      const nextErrors: Partial<Record<keyof EmployeeFormValues, string>> = {}
      for (const rule of EMPLOYEE_TEXT_RULES) {
        const error = validateField(rule.name, values[rule.name])
        if (error) nextErrors[rule.name] = error
      }
      return nextErrors
    },
    [validateField],
  )

  const fetchRows = useCallback(async ({ page, pageSize }: GridQueryParams): Promise<GridQueryResult<Employee>> => {
    const paged = await employeesApi.list(page, pageSize)
    return {
      rows: paged.content,
      totalRows: paged.totalElements,
    }
  }, [])

  const handleFieldChange = useCallback((name: keyof EmployeeFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }))
    setFormErrors((prev) => {
      if (!prev[name]) return prev
      return { ...prev, [name]: '' }
    })
  }, [])

  const handleFieldBlur = useCallback(
    (name: keyof EmployeeFormValues) => {
      const err = validateField(name, formValues[name])
      setFormErrors((prev) => ({ ...prev, [name]: err }))
    },
    [formValues, validateField],
  )

  const openCreate = () => {
    setEditing(null)
    setFormValues(EMPTY_EMPLOYEE_FORM)
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }

  const openEdit = useCallback((row: Employee) => {
    setEditing(row)
    setFormValues({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email ?? '',
      employeeCode: row.employeeCode ?? '',
      departmentId: row.departmentId != null ? String(row.departmentId) : '',
      designationId: row.designationId != null ? String(row.designationId) : '',
      managerId: row.managerId != null ? String(row.managerId) : '',
      joinedAt: row.joinedAt ? row.joinedAt.slice(0, 10) : '',
    })
    setFormErrors({})
    setSubmitError('')
    setOpen(true)
  }, [])

  const close = () => setOpen(false)

  const handleSubmit = async () => {
    setSubmitError('')
    const errors = validateForm(formValues)
    setFormErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    const parseId = (v: string) => (v === '' ? undefined : Number(v))

    const body: EmployeeRequest = {
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      email: formValues.email.trim() || undefined,
      employeeCode: formValues.employeeCode.trim() || undefined,
      departmentId: parseId(formValues.departmentId),
      designationId: parseId(formValues.designationId),
      managerId: parseId(formValues.managerId),
      joinedAt: formValues.joinedAt || undefined,
    }

    try {
      if (editing) await employeesApi.update(editing.id, body)
      else await employeesApi.create(body)
      close()
      setRefreshToken((value) => value + 1)
      const allEmp = await employeesApi.listAll()
      setAllEmployees(allEmp)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const openPayrollBank = useCallback((row: Employee) => {
    setBankEmployee(row)
    setBankDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this employee?')) return
    try {
      await employeesApi.delete(id)
      setRefreshToken((value) => value + 1)
      const allEmp = await employeesApi.listAll()
      setAllEmployees(allEmp)
    } catch {
      // ignore
    }
  }, [])

  const actionConfig: DataGridActionConfig<Employee> = useMemo(
    () => ({
      onEdit: openEdit,
      onDelete: (row) => handleDelete(row.id),
      onPayrollBank: openPayrollBank,
    }),
    [handleDelete, openEdit, openPayrollBank],
  )

  const columnDefs = useMemo(() => getEmployeeColumnDefs(), [])

  return (
    <PageLayout
      title="Employees"
      maxWidth="none"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <AppButton component={Link} to="/hr" variant="outlined">
            Back
          </AppButton>
          <AppButton variant="contained" onClick={openCreate}>
            Add employee
          </AppButton>
        </Box>
      }
    >
      <DataGrid<Employee>
        columnDefs={columnDefs}
        fetchRows={fetchRows}
        getRowId={(row) => String(row.id)}
        actionConfig={actionConfig}
        refreshToken={refreshToken}
        defaultPageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        height="calc(100svh - 170px)"
      />

      <CommonInputForm<EmployeeFormValues>
        open={open}
        title={editing ? 'Edit employee' : 'Add employee'}
        fields={formFields}
        values={formValues}
        errors={formErrors}
        submitError={submitError}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        onClose={close}
        onSubmit={handleSubmit}
        submitLabel="Save"
      />

      <EmployeePayrollBankDialog
        open={bankDialogOpen}
        employee={bankEmployee}
        onClose={() => {
          setBankDialogOpen(false)
          setBankEmployee(null)
        }}
        onSaved={() => setRefreshToken((value) => value + 1)}
      />
    </PageLayout>
  )
}
