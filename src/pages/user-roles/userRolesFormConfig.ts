import type { GenericFormFieldConfig } from '../../components/shared'

export type UserRolesFormValues = {
  username: string
  employeeId: string
}

export const USER_ROLES_FORM_CONFIG: Array<GenericFormFieldConfig<UserRolesFormValues>> = [
  { name: 'username', label: 'Username', readOnly: true },
  { name: 'employeeId', label: 'Employee ID', readOnly: true },
]

export const EMPTY_USER_ROLES_FORM: UserRolesFormValues = {
  username: '',
  employeeId: '',
}
