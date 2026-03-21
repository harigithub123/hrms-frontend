import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { AppTypography } from './AppTypography'

interface PageLayoutProps {
  /** Shown in AppShell top bar; omit to avoid duplicating the main heading. */
  title?: string
  actions?: ReactNode
  children: ReactNode
  /** Default 960; set higher or 'none' for full-width dashboards */
  maxWidth?: number | string
}

export function PageLayout({ title, actions, children, maxWidth = 960 }: PageLayoutProps) {
  const showHeaderRow = Boolean(title) || Boolean(actions)
  return (
    <Box sx={{ maxWidth, mx: 0, width: '100%' }}>
      {showHeaderRow && (
        <Box
          sx={{
            py: 1.5,
            display: 'flex',
            justifyContent: title ? 'space-between' : 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {title ? (
            <AppTypography variant="h4" component="h1">
              {title}
            </AppTypography>
          ) : null}
          {actions}
        </Box>
      )}
      <Box sx={{ mt: showHeaderRow ? 1.5 : 0 }}>{children}</Box>
    </Box>
  )
}
