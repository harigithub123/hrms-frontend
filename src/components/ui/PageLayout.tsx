import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { AppTypography } from './AppTypography'

interface PageLayoutProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <Box sx={{ maxWidth: 960, mx: 0 }}>
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
