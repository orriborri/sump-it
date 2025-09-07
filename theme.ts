'use client'

import { createTheme as createMuiTheme } from '@mui/material/styles'

// Coffee-themed MUI theme for Sump It
export const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#8B4513', // Coffee brown
      light: '#A0522D',
      dark: '#654321',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#D2691E', // Chocolate/Orange
      light: '#DEB887',
      dark: '#A0522D',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FEFEFE', // Clean white background
      paper: '#F5F5DC', // Cream for cards - like our improved design
    },
    text: {
      primary: '#654321', // Dark coffee brown - excellent contrast
      secondary: '#8B4513', // Coffee brown for secondary text
    },
    info: {
      main: '#6F4E37', // Coffee bean brown
    },
    success: {
      main: '#228B22', // Forest green (like coffee plants)
    },
    warning: {
      main: '#FF8C00', // Dark orange
    },
    error: {
      main: '#DC143C', // Crimson
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: '#654321',
    },
    h2: {
      fontWeight: 600,
      color: '#654321',
    },
    h3: {
      fontWeight: 600,
      color: '#654321',
    },
    h4: {
      fontWeight: 600,
      color: '#654321',
    },
    h5: {
      fontWeight: 600,
      color: '#654321',
    },
    h6: {
      fontWeight: 600,
      color: '#654321',
    },
    subtitle1: {
      color: '#5D4E37',
    },
    subtitle2: {
      color: '#5D4E37',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#F5F5DC', // Cream background like cards
          color: '#654321', // Dark coffee brown text
          border: '2px solid #8B4513', // Coffee brown border
          boxShadow: '0 2px 8px rgba(139, 69, 19, 0.15)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#F5F5DC', // Cream background like our improved design
          border: '2px solid #8B4513', // Coffee brown border
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(139, 69, 19, 0.2)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(139, 69, 19, 0.3)',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(139, 69, 19, 0.1)',
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': {
            color: '#8B4513',
            fontWeight: 600,
          },
          '&.Mui-completed': {
            color: '#5D4E37',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#A0522D',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8B4513',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#A0522D',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#8B4513',
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
})
