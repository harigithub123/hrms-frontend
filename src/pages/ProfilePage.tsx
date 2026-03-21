import { useAuth } from '../contexts/AuthContext'
import { AppTypography, PageLayout } from '../components/ui'

export default function ProfilePage() {
  const { user, roles } = useAuth()

  return (
    <PageLayout>
      <AppTypography variant="body1" sx={{ mb: 1 }}>
        <strong>Username:</strong> {user?.username ?? '—'}
      </AppTypography>
      <AppTypography variant="body1" sx={{ mb: 1 }}>
        <strong>Email:</strong> {user?.email ?? '—'}
      </AppTypography>
      <AppTypography variant="body1" sx={{ mb: 1 }}>
        <strong>Roles:</strong> {roles.length ? roles.join(', ') : '—'}
      </AppTypography>
      <AppTypography variant="body1" sx={{ mb: 1 }}>
        <strong>Linked employee ID:</strong> {user?.employeeId ?? '—'}
      </AppTypography>
      <AppTypography variant="body1" sx={{ mb: 1 }}>
        <strong>Direct reports:</strong>{' '}
        {user?.directReportCount != null ? user.directReportCount : '—'}
      </AppTypography>
    </PageLayout>
  )
}
