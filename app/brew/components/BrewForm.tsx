'use client'
import React from 'react'
import { Container, Box, Alert } from '@mui/material'
import { FormData } from '../workflow/types'
import { useForm } from '../workflow/useForm'
import { BrewSteps } from './BrewSteps'
import { RuntimeType } from '@/app/lib/types'
import type { Beans, Methods, Grinders } from '@/app/lib/db.d'

interface BrewFormProps {
  onSubmit: (_data: FormData) => void
  beans: RuntimeType<Beans>[]
  methods: RuntimeType<Methods>[]
  grinders: RuntimeType<Grinders>[]
  isLoading?: boolean
  error?: string | null
}

export const BrewForm: React.FC<BrewFormProps> = ({
  onSubmit,
  beans,
  methods,
  grinders,
  isLoading = false,
  error = null,
}) => {
  const form = useForm()

  const handleSubmit = () => {
    onSubmit(form.formData)
  }

  return (
    <Container maxWidth="md">
      <Box component="div" sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <BrewSteps
          form={form}
          onSubmit={handleSubmit}
          beans={beans}
          methods={methods}
          grinders={grinders}
          isLoading={isLoading}
        />
      </Box>
    </Container>
  )
}
