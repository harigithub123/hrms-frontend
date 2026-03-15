import { Drawer, List, ListItemButton, ListItemText, Box, Divider } from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AppButton } from '../ui'

const DRAWER_WIDTH = 240

type MenuItem = {
  label: string
  path: string
  roles?: string[] // without ROLE_ prefix
}

const MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/' },
  { label: 'HR', path: '/hr', roles: ['HR', 'ADMIN'] },
  { label: 'Departments', path: '/departments', roles: ['HR', 'ADMIN'] },
  { label: 'Designations', path: '/designations', roles: ['HR', 'ADMIN'] },
  { label: 'Employees', path: '/employees', roles: ['HR', 'ADMIN'] },
  { label: 'Admin', path: '/admin', roles: ['ADMIN'] },
]

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasRole, logout } = useAuth()

  const items = MENU.filter((i) => !i.roles || i.roles.some((r) => hasRole(r)))

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
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ fontWeight: 700, fontSize: 14 }}>HRMS</Box>
          <AppButton variant="outlined" onClick={logout}>
            Logout
          </AppButton>
        </Box>
        <Divider />
        <List dense sx={{ py: 0.5 }}>
          {items.map((item) => {
            const selected = location.pathname === item.path
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

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            flex: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            p: 2,
            textAlign: 'left',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

