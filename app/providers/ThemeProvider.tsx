'use client'

import React from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { theme } from '../../theme'

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <AppRouterCacheProvider>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </AppRouterCacheProvider>
  )
}
