import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import HrPage from './pages/HrPage'
import DepartmentsPage from './pages/DepartmentsPage'
import DesignationsPage from './pages/DesignationsPage'
import EmployeesPage from './pages/EmployeesPage'
import ProfilePage from './pages/ProfilePage'
import LeavePage from './pages/LeavePage'
import LeaveCalendarPage from './pages/LeaveCalendarPage'
import LeaveAdminPage from './pages/LeaveAdminPage'
import LeaveApprovalsPage from './pages/LeaveApprovalsPage'
import AttendancePage from './pages/AttendancePage'
import PayrollPage from './pages/PayrollPage'
import UserLinkPage from './pages/UserLinkPage'
import PayslipsPage from './pages/PayslipsPage'
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
            <Route path="/leave/calendar" element={<LeaveCalendarPage />} />
            <Route path="/leave/admin" element={<LeaveAdminPage />} />
            <Route path="/leave/approvals" element={<LeaveApprovalsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/users/link" element={<UserLinkPage />} />
            <Route path="/payslips" element={<PayslipsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
