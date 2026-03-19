import type { ElementType } from 'react'
import { Button, type ButtonProps } from '@mui/material'

export function AppButton<C extends ElementType = 'button'>(props: ButtonProps<C, { component?: C }>) {
  return <Button size="small" disableElevation {...props} />
}
