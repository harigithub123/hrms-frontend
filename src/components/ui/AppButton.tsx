import { Button, type ButtonProps } from '@mui/material'

export function AppButton(props: ButtonProps) {
  return <Button size="small" disableElevation {...props} />
}
