import React from 'react'
import { Box, Typography, Button, Card, CardContent } from '@mui/material'
import { Error, ArrowBack } from '@mui/icons-material'
import Link from 'next/link'

/**
 * Not-found page displayed when a grinder ID does not exist.
 * Provides a user-friendly error message and a link back to the grinders list.
 */
export default function NotFound() {
  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
      <Card>
        <CardContent sx={{ py: 6 }}>
          <Error sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />

          <Typography variant="h4" component="h1" gutterBottom>
            Grinder Not Found
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            The grinder you&apos;re looking for doesn&apos;t exist or may have
            been deleted.
          </Typography>

          <Button
            component={Link}
            href="/manage/grinders"
            variant="contained"
            startIcon={<ArrowBack />}
            size="large"
          >
            Back to Grinders
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}
