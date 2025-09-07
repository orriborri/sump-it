import React from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import { Home, Coffee } from '@mui/icons-material'
import Link from 'next/link'

export default function NotFound() {
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
        <Typography variant="h1" sx={{ fontSize: '4rem', color: 'primary.main', mb: 2 }}>
          404
        </Typography>
        
        <Typography variant="h4" gutterBottom color="primary.main">
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The coffee brewing page you're looking for doesn't exist. 
          Maybe it's time for a fresh brew?
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            component={Link}
            href="/"
            variant="contained"
            color="primary"
            startIcon={<Home />}
            size="large"
          >
            Go Home
          </Button>
          
          <Button
            component={Link}
            href="/brew"
            variant="outlined"
            color="primary"
            startIcon={<Coffee />}
            size="large"
          >
            Start Brewing
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
