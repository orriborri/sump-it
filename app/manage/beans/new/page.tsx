import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { AddBeanForm } from '../../../manage/AddBeanForm'
import Link from 'next/link'
import { ArrowBack } from '@mui/icons-material'

export default function NewBeanPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Link href="/manage/beans" style={{ color: '#8B4513' }}>
          <ArrowBack />
        </Link>
        <Typography variant="h4" sx={{ color: '#8B4513', fontWeight: 600 }}>
          Add New Coffee Bean
        </Typography>
      </Box>

      <Paper sx={{ p: 3, bgcolor: '#F5F5DC', border: '2px solid #8B4513' }}>
        <AddBeanForm />
      </Paper>
    </Box>
  )
}
