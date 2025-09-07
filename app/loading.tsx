import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function Loading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
      }}
    >
      <CircularProgress 
        size={60} 
        thickness={4}
        sx={{ color: 'primary.main' }}
      />
      <Typography variant="h6" color="primary.main">
        Brewing your coffee experience...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please wait while we prepare everything
      </Typography>
    </Box>
  )
}
