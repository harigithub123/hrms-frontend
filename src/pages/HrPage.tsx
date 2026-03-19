import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTypography, PageLayout } from '../components/ui'
import { Box } from '@mui/material'

export default function HrPage() {
  const { user } = useAuth()

  return (
    <PageLayout title="HR">
      <AppTypography variant="body1" sx={{ mb: 2 }}>
        HR area. Welcome, <strong>{user?.username}</strong>. Use the sidebar or shortcuts below.
      </AppTypography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <AppButton component={RouterLink} to="/departments" variant="outlined">
          Departments
        </AppButton>
        <AppButton component={RouterLink} to="/designations" variant="outlined">
          Designations
        </AppButton>
        <AppButton component={RouterLink} to="/employees" variant="outlined">
          Employees
        </AppButton>
        <AppButton component={RouterLink} to="/users/link" variant="outlined">
          User ↔ Employee
        </AppButton>
        <AppButton component={RouterLink} to="/leave/admin" variant="outlined">
          Leave admin
        </AppButton>
        <AppButton component={RouterLink} to="/payroll" variant="outlined">
          Payroll
        </AppButton>
        <AppButton component={RouterLink} to="/attendance" variant="outlined">
          Attendance
        </AppButton>
      </Box>
    </PageLayout>
  )
}
