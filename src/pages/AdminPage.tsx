import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTypography, PageLayout } from '../components/ui'

export default function AdminPage() {
  const { user } = useAuth()

  return (
    <PageLayout>
      <AppTypography variant="body1" sx={{ mb: 2 }}>
        Admin-only area. Welcome, <strong>{user?.username}</strong>.
      </AppTypography>
      <AppButton component={RouterLink} to="/admin/user-roles" variant="contained">
        Manage user roles
      </AppButton>
    </PageLayout>
  )
}
