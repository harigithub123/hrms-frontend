import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { AppTypography } from './AppTypography'

interface PageLayoutProps {
  title: string
  actions?: ReactNode
  children: ReactNode
  /** Default 960; set higher or 'none' for full-width dashboards */
  maxWidth?: number | string
}

export function PageLayout({ title, actions, children, maxWidth = 960 }: PageLayoutProps) {
  return (
    <Box sx={{ maxWidth, mx: 0, width: '100%' }}>
      <Box
        sx={{
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <AppTypography variant="h4" component="h1">
          {title}
        </AppTypography>
        {actions}
      </Box>
      <Box sx={{ mt: 1.5 }}>{children}</Box>
    </Box>
  )
}
