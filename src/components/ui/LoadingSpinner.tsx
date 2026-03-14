import { Box, CircularProgress } from '@mui/material'

export function LoadingSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress size={24} />
    </Box>
  )
}
