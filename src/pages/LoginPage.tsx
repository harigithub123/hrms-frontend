import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Container, Alert, Paper } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { AppButton, AppTextField, AppTypography, LoadingSpinner } from '../components/ui'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, isLoading, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(
        message.includes('fetch') || message === 'Failed to fetch'
          ? 'Cannot reach server. Is the backend running on port 8080?'
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4, minHeight: '40vh', display: 'flex', alignItems: 'center' }}>
        <Paper elevation={2} sx={{ p: 3, width: '100%' }}>
          <AppTypography variant="h5" component="h1" gutterBottom align="center">
            HRMS Sign in
          </AppTypography>
          <AppTypography variant="body2" color="text.secondary" sx={{ mb: 2 }} align="center">
            Employees: use your <strong>employee ID</strong> as username (same number as in HR), or your <strong>work
            email</strong>. Admins: default <strong>admin</strong> / <strong>password</strong>.
          </AppTypography>
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            <AppTextField
              label="Employee ID or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="dense"
              required
              autoComplete="username"
              autoFocus
              helperText="Employee accounts use the numeric employee ID; you can also sign in with your email after HR updates it."
            />
            <AppTextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="dense"
              required
              autoComplete="current-password"
            />
            <AppButton type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 2 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </AppButton>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}
