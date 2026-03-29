/**
 * Label for the main content AppBar (matches sidebar intent for each route).
 */
export function getAppBarTitle(pathname: string): string {
  const entries: { prefix: string; label: string }[] = [
    { prefix: '/leave/approvals', label: 'Leave approvals' },
    { prefix: '/leave/admin', label: 'Leave admin' },
    { prefix: '/leave/calendar', label: 'Leave' },
    { prefix: '/leave/team', label: 'Leave' },
    { prefix: '/admin/user-roles', label: 'User roles' },
    { prefix: '/designations', label: 'Designations' },
    { prefix: '/employees', label: 'Employees' },
    { prefix: '/payslips', label: 'My payslips' },
    { prefix: '/attendance', label: 'Attendance' },
    { prefix: '/payroll', label: 'Payroll' },
    { prefix: '/hr/onboarding', label: 'Onboarding' },
    { prefix: '/hr/offers', label: 'Offers' },
    { prefix: '/hr/compensation', label: 'Compensation' },
    { prefix: '/advances', label: 'Advances' },
    { prefix: '/profile', label: 'User details' },
    { prefix: '/admin', label: 'Admin' },
    { prefix: '/hr', label: 'HR' },
    { prefix: '/leave', label: 'Leave' },
  ]

  for (const { prefix, label } of entries) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return label
    }
  }

  if (pathname === '/') {
    return 'Dashboard'
  }

  return ''
}
