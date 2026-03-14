import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { AppButton } from './ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace' }}>
            {this.state.error.message}
          </Typography>
          <AppButton
            variant="contained"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </AppButton>
        </Box>
      )
    }
    return this.props.children
  }
}
