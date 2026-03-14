import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTypography, PageLayout } from '../components/ui'

export default function HrPage() {
  const { user, logout } = useAuth()

  return (
    <PageLayout
      title="HR"
      actions={
        <>
          <AppButton component={Link} to="/" variant="outlined" sx={{ mr: 1 }}>Dashboard</AppButton>
          <AppButton variant="outlined" color="primary" onClick={logout}>Sign out</AppButton>
        </>
      }
    >
      <AppTypography variant="body1">
        HR area. Welcome, <strong>{user?.username}</strong>.
      </AppTypography>
    </PageLayout>
  )
}
