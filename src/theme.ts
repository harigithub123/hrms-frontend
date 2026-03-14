import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  typography: {
    fontFamily: '"Segoe UI", system-ui, Roboto, sans-serif',
    fontSize: 14,
    h1: { fontSize: '1.75rem', fontWeight: 600 },
    h2: { fontSize: '1.5rem', fontWeight: 600 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.125rem', fontWeight: 600 },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.9375rem', fontWeight: 600 },
    body1: { fontSize: 14 },
    body2: { fontSize: 13 },
    button: { fontSize: 14, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { size: 'small', disableElevation: true },
      styleOverrides: {
        root: { minHeight: 32, padding: '4px 12px' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: { '& .MuiInputBase-input': { fontSize: 14 } },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: 14 } },
    },
    MuiAlert: {
      styleOverrides: { root: { fontSize: 13 } },
    },
  },
})
