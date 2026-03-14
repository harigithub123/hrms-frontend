import { Box, Container } from '@mui/material'
import type { ReactNode } from 'react'
import { AppTypography } from './AppTypography'

interface PageLayoutProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <AppTypography variant="h4" component="h1">
          {title}
        </AppTypography>
        {actions}
      </Box>
      <Box sx={{ mt: 1.5 }}>{children}</Box>
    </Container>
  )
}
