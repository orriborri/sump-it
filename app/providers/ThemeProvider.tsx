'use client'

import React from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { theme } from '../../theme'

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * Application theme provider that wraps children with MUI theme configuration.
 * Integrates the custom coffee-themed MUI theme with Next.js App Router caching
 * and provides CssBaseline for consistent cross-browser styling.
 */
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
