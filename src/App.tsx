import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import HrPage from './pages/HrPage'
import DepartmentsPage from './pages/department/DepartmentsPage'
import DesignationsPage from './pages/designations/DesignationsPage'
import EmployeesPage from './pages/employees/EmployeesPage'
import ProfilePage from './pages/ProfilePage'
import LeavePage from './pages/LeavePage'
import LeaveCalendarPage from './pages/LeaveCalendarPage'
import LeaveAdminPage from './pages/leave-admin/LeaveAdminPage'
import LeaveReportPage from './pages/LeaveReportPage'
import LeaveApprovalsPage from './pages/LeaveApprovalsPage'
import AttendancePage from './pages/AttendancePage'
import PayrollPage from './pages/PayrollPage'
import UserRolesPage from './pages/UserRolesPage'
import PayslipsPage from './pages/PayslipsPage'
import OnboardingPage from './pages/OnboardingPage'
import OffersPage from './pages/offers/OffersPage'
import CompensationPage from './pages/compensation/CompensationPage'
import LeaveTypesPage from './pages/leave-types/LeaveTypesPage'
import SalaryComponentsPage from './pages/salary-components/SalaryComponentsPage'
import AdvancesPage from './pages/AdvancesPage'
import AppShell from './components/layout/AppShell'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/hr" element={<HrPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/designations" element={<DesignationsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route path="/leave/team" element={<LeavePage />} />
            <Route path="/leave/calendar" element={<LeaveCalendarPage />} />
            <Route path="/leave/report" element={<LeaveReportPage />} />
            <Route path="/leave/admin" element={<LeaveAdminPage />} />
            <Route path="/leave/approvals" element={<LeaveApprovalsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route
              path="/admin/user-roles"
              element={
                <ProtectedRoute requiredRoles={['ADMIN']}>
                  <UserRolesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/payslips" element={<PayslipsPage />} />
            <Route path="/hr/onboarding" element={<OnboardingPage />} />
            <Route path="/hr/offers" element={<OffersPage />} />
            <Route path="/hr/compensation" element={<CompensationPage />} />
            <Route path="/hr/leave-types" element={<LeaveTypesPage />} />
            <Route path="/hr/salary-components" element={<SalaryComponentsPage />} />
            <Route path="/advances" element={<AdvancesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
