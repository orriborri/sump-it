'use client'

import React from 'react'
import { Container } from '@mui/material'

interface FormWrapperProps {
  children?: React.ReactNode
}

export default function FormWrapper({ children }: FormWrapperProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {children}
    </Container>
  )
}
