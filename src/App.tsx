import { Box, Button, Container, Typography } from '@mui/material'
import './App.css'

function App() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          HRMS Frontend
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          React + Vite + MUI
        </Typography>
        <Button variant="contained" size="large">
          Get started
        </Button>
      </Box>
    </Container>
  )
}

export default App
