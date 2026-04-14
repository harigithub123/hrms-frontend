import { Fragment, useEffect, useState } from 'react'
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Collapse,
  Box,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getAppBarTitle } from './appBarTitle'

const DRAWER_WIDTH = 240

/** Menu paths use no ROLE_ prefix in `roles`. */
type NavItem = {
  label: string
  path: string
  /** Extra paths that should highlight this item (e.g. /leave/team for Leave). */
  matchPaths?: string[]
  roles?: string[]
}

type NavSection = {
  id: string
  label: string
  /** When true, section is a collapsible parent with nested links. */
  collapsible: boolean
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'general',
    label: 'General',
    collapsible: false,
    items: [
      { label: 'Dashboard', path: '/' },
      {
        label: 'Leave',
        path: '/leave',
        matchPaths: ['/leave/team', '/leave/calendar', '/leave/report'],
      },
      { label: 'Leave approvals', path: '/leave/approvals' },
      { label: 'Attendance', path: '/attendance' },
      { label: 'My payslips', path: '/payslips' },
      { label: 'Advances', path: '/advances' },
      { label: 'My profile', path: '/profile', matchPaths: ['/profile'] },
    ],
  },
  {
    id: 'master-data',
    label: 'Master data',
    collapsible: true,
    items: [
      { label: 'Departments', path: '/departments', roles: ['HR', 'ADMIN'] },
      { label: 'Designations', path: '/designations', roles: ['HR', 'ADMIN'] },
      { label: 'Leave types', path: '/hr/leave-types', roles: ['HR', 'ADMIN'] },
      { label: 'Salary components', path: '/hr/salary-components', roles: ['HR', 'ADMIN'] },
      { label: 'Fixed payroll components', path: '/hr/payroll-fixed-components', roles: ['HR', 'ADMIN'] },
      { label: 'Employees', path: '/employees', roles: ['HR', 'ADMIN'] },
    ],
  },
  {
    id: 'hr-operations',
    label: 'HR & payroll',
    collapsible: true,
    items: [
      { label: 'Offers', path: '/hr/offers', roles: ['HR', 'ADMIN'] },
      { label: 'Onboarding', path: '/hr/onboarding', roles: ['HR', 'ADMIN'] },
      { label: 'Compensation', path: '/hr/compensation', roles: ['HR', 'ADMIN'] },
      { label: 'Leave admin', path: '/leave/admin', roles: ['HR', 'ADMIN'] },
      { label: 'Payroll', path: '/payroll', roles: ['HR', 'ADMIN'] },
      { label: 'Holidays', path: '/hr/holidays', roles: ['HR', 'ADMIN'] },
      { label: 'Separation & letters', path: '/hr/separation-board', roles: ['HR', 'ADMIN'] },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    collapsible: true,
    items: [
      { label: 'System admin', path: '/admin', roles: ['ADMIN'] },
      { label: 'User roles', path: '/admin/user-roles', roles: ['ADMIN'] },
    ],
  },
]

function NavChevron({ open }: { open: boolean }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      sx={{
        flexShrink: 0,
        opacity: 0.7,
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: (theme) =>
          theme.transitions.create('transform', { duration: theme.transitions.duration.shorter }),
      }}
    >
      <path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </Box>
  )
}

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasRole, logout } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const hasReportees = (user?.directReportCount ?? 0) > 0
  const canSeeApprovals = hasRole('HR') || hasRole('ADMIN') || hasReportees

  const itemVisible = (item: NavItem) => {
    if (item.path === '/leave/approvals') return canSeeApprovals
    if (!item.roles?.length) return true
    return item.roles.some((r) => hasRole(r))
  }

  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(itemVisible),
  })).filter((s) => s.items.length > 0)

  const isNavSelected = (item: NavItem) =>
    location.pathname === item.path || (item.matchPaths ?? []).includes(location.pathname)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  /** Open any collapsible group that contains the current route. */
  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev }
      for (const s of NAV_SECTIONS) {
        if (!s.collapsible) continue
        const items = s.items.filter((item) => {
          if (item.path === '/leave/approvals') return canSeeApprovals
          if (!item.roles?.length) return true
          return item.roles.some((r) => hasRole(r))
        })
        const hasActive = items.some(
          (item) =>
            location.pathname === item.path || (item.matchPaths ?? []).includes(location.pathname)
        )
        if (hasActive) {
          next[s.id] = true
        }
      }
      return next
    })
  }, [location.pathname, canSeeApprovals, hasRole])

  const toggleSection = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleMenuClose = () => setAnchorEl(null)
  const handleLogout = () => {
    handleMenuClose()
    logout()
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '?'

  const appBarTitle = getAppBarTitle(location.pathname)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14 }}>
            HRMS
          </Typography>
        </Box>
        <Divider />
        <Box component="nav" aria-label="Main navigation">
        <List dense sx={{ py: 0.5 }}>
          {navSections.map((section, si) => {
            const sectionHasSelection = section.items.some(isNavSelected)
            const isOpen = section.collapsible ? !!expanded[section.id] : true

            if (!section.collapsible) {
              return (
                <Fragment key={section.id}>
                  <ListSubheader
                    disableSticky
                    sx={{
                      px: 2,
                      py: 0.75,
                      mt: si > 0 ? 0.5 : 0,
                      lineHeight: 1.25,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'text.secondary',
                      bgcolor: 'transparent',
                    }}
                  >
                    {section.label}
                  </ListSubheader>
                  {section.items.map((item) => (
                    <ListItemButton
                      key={`${section.id}-${item.path}`}
                      selected={isNavSelected(item)}
                      onClick={() => navigate(item.path)}
                      sx={{ pl: 2 }}
                    >
                      <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItemButton>
                  ))}
                </Fragment>
              )
            }

            return (
              <Fragment key={section.id}>
                {si > 0 && <Divider component="li" sx={{ my: 0.5, listStyle: 'none' }} />}
                <ListItemButton
                  onClick={() => toggleSection(section.id)}
                  selected={sectionHasSelection}
                  aria-expanded={isOpen}
                  sx={{ pl: 2, py: 1 }}
                >
                  <ListItemText
                    primary={section.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                  />
                  <NavChevron open={isOpen} />
                </ListItemButton>
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding dense>
                    {section.items.map((item) => (
                      <ListItemButton
                        key={`${section.id}-${item.path}`}
                        selected={isNavSelected(item)}
                        onClick={() => navigate(item.path)}
                        sx={{ pl: 3.5 }}
                      >
                        <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Fragment>
            )
          })}
        </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar
            disableGutters
            sx={{
              px: 2,
              minHeight: { xs: 48, sm: 48 },
              gap: 1,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography component="h1" variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {appBarTitle}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={handleAvatarClick}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={open ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>{initials}</Avatar>
            </IconButton>
            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                My profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            borderTop: 0,
            borderRadius: '0 0 4px 4px',
            bgcolor: 'background.paper',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

