import { useState } from 'react'
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
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

type MenuItem = {
  label: string
  path: string
  roles?: string[] // without ROLE_ prefix
}

const MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/' },
  { label: 'Leave', path: '/leave' },
  { label: 'Leave approvals', path: '/leave/approvals' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'My payslips', path: '/payslips' },
  { label: 'HR', path: '/hr', roles: ['HR', 'ADMIN'] },
  { label: 'Departments', path: '/departments', roles: ['HR', 'ADMIN'] },
  { label: 'Designations', path: '/designations', roles: ['HR', 'ADMIN'] },
  { label: 'Employees', path: '/employees', roles: ['HR', 'ADMIN'] },
  { label: 'Leave admin', path: '/leave/admin', roles: ['HR', 'ADMIN'] },
  { label: 'Payroll', path: '/payroll', roles: ['HR', 'ADMIN'] },
  { label: 'User ↔ Employee', path: '/users/link', roles: ['HR', 'ADMIN'] },
  { label: 'Admin', path: '/admin', roles: ['ADMIN'] },
]

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasRole, logout } = useAuth()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const hasReportees = (user?.directReportCount ?? 0) > 0
  const canSeeApprovals = hasRole('HR') || hasRole('ADMIN') || hasReportees

  const items = MENU.filter((i) => {
    if (i.path === '/leave/approvals') return canSeeApprovals
    if (!i.roles) return true
    return i.roles.some((r) => hasRole(r))
  })

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
        <List dense sx={{ py: 0.5 }}>
          {items.map((item) => {
            const selected =
              item.path === '/leave'
                ? location.pathname === '/leave' || location.pathname === '/leave/team'
                : location.pathname === item.path
            return (
              <ListItemButton
                key={item.path}
                selected={selected}
                onClick={() => navigate(item.path)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            )
          })}
        </List>
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
                User details
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

