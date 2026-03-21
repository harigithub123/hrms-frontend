import { useAuth } from '../contexts/AuthContext'
import { AppTypography, PageLayout } from '../components/ui'

export default function DashboardPage() {
  const { user, roles } = useAuth()

  return (
    <PageLayout>
      <AppTypography variant="body1">
        Welcome, <strong>{user?.username}</strong>
      </AppTypography>
      <AppTypography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Roles: {roles.join(', ') || '—'}
      </AppTypography>
    </PageLayout>
  )
}
