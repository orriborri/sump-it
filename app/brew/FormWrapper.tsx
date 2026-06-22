'use client'

import React from 'react'
import { Container } from '@mui/material'

interface FormWrapperProps {
  children?: React.ReactNode
}

/**
 * Provides a centered container wrapper for the brew form content
 * Applies consistent padding and maximum width constraints
 */
export default function FormWrapper({ children }: FormWrapperProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {children}
    </Container>
  )
}
