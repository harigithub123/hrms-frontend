import { Link } from 'react-router-dom'
import { Box } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTypography, PageLayout } from '../components/ui'

export default function DashboardPage() {
  const { user, logout, roles, hasRole } = useAuth()

  return (
    <PageLayout
      title="Dashboard"
      actions={<AppButton variant="outlined" color="primary" onClick={logout}>Sign out</AppButton>}
    >
      <AppTypography variant="body1">
        Welcome, <strong>{user?.username}</strong>
      </AppTypography>
      <AppTypography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Roles: {roles.join(', ') || '—'}
      </AppTypography>
      {hasRole('ADMIN') && (
        <AppTypography variant="body2" color="primary" sx={{ mt: 0.5 }}>
          You have admin access.
        </AppTypography>
      )}
      {hasRole('HR') && (
        <AppTypography variant="body2" color="primary" sx={{ mt: 0.25 }}>
          You have HR access.
        </AppTypography>
      )}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        {hasRole('ADMIN') && (
          <AppButton component={Link} to="/admin" variant="contained">Admin</AppButton>
        )}
        {(hasRole('HR') || hasRole('ADMIN')) && (
          <AppButton component={Link} to="/hr" variant="contained">HR</AppButton>
        )}
      </Box>
    </PageLayout>
  )
}
