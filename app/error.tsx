'use client'

import React from 'react'
import { Box, Typography, Button, Paper, Alert } from '@mui/material'
import { Refresh, Home } from '@mui/icons-material'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        p: 4,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h4" gutterBottom color="error">
          Something went wrong!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We encountered an unexpected error in your coffee brewing app.
        </Typography>

        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>Error:</strong> {error.message}
          </Typography>
          {error.digest && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Error ID: {error.digest}
            </Typography>
          )}
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={reset}
          >
            Try Again
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Home />}
            href="/"
          >
            Go Home
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
