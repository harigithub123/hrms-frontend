import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTypography, PageLayout } from '../components/ui'

export default function AdminPage() {
  const { user, logout } = useAuth()

  return (
    <PageLayout
      title="Admin"
      actions={
        <>
          <AppButton component={Link} to="/" variant="outlined" sx={{ mr: 1 }}>Dashboard</AppButton>
          <AppButton variant="outlined" color="primary" onClick={logout}>Sign out</AppButton>
        </>
      }
    >
      <AppTypography variant="body1">
        Admin-only area. Welcome, <strong>{user?.username}</strong>.
      </AppTypography>
    </PageLayout>
  )
}
