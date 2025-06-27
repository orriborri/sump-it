'use client'

import { createTheme as createMuiTheme } from '@mui/material/styles'

// Create a theme instance using MUI instead of Mantine
export const theme = createMuiTheme({
  // Your theme customizations can go here
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})
