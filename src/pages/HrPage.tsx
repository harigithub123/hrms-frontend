import { useAuth } from '../contexts/AuthContext'
import { AppTypography, PageLayout } from '../components/ui'

export default function HrPage() {
  const { user } = useAuth()

  return (
    <PageLayout title="HR">
      <AppTypography variant="body1">
        HR area. Welcome, <strong>{user?.username}</strong>. Use the menu to open Departments, Designations, or Employees.
      </AppTypography>
    </PageLayout>
  )
}
