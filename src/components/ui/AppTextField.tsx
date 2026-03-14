import { TextField, type TextFieldProps } from '@mui/material'

export function AppTextField(props: TextFieldProps) {
  return <TextField size="small" variant="outlined" fullWidth {...props} />
}
