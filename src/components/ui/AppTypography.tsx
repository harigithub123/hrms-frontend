import { Typography, type TypographyProps } from '@mui/material'

export function AppTypography(props: TypographyProps) {
  return <Typography variant={props.variant ?? 'body1'} {...props} />
}
