import { useAuth } from '../contexts/AuthContext'
import { AppTypography, PageLayout } from '../components/ui'

export default function AdminPage() {
  const { user } = useAuth()

  return (
    <PageLayout title="Admin">
      <AppTypography variant="body1">
        Admin-only area. Welcome, <strong>{user?.username}</strong>.
      </AppTypography>
    </PageLayout>
  )
}
