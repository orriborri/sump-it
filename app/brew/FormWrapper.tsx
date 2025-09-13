'use client'

import React from 'react'
import { Container } from '@mui/material'

interface Bean {
  id: number
  name: string
  roster: string
  rostery: string
  created_at: Date
}

interface Method {
  id: number
  name: string
  created_at: Date
}

interface Grinder {
  id: number
  name: string
  min_setting: number
  max_setting: number
  step_size: number
  setting_type: string
  created_at: Date
}

interface FormWrapperProps {
  children?: React.ReactNode
  beans?: Bean[]
  methods?: Method[]
  grinders?: Grinder[]
}

export default function FormWrapper({ children, beans, methods, grinders }: FormWrapperProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {children}
    </Container>
  )
}
