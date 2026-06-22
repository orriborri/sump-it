'use client'

import React, { useState } from 'react'
import { Box, Button, Stack, Alert } from '@mui/material'
import { useForm } from 'react-hook-form'
import { Input } from '../../common/Input'
import { addMethod, MethodFormData } from '../actions'
import { LocalCafe } from '@mui/icons-material'

interface AddMethodFormProps {
  onSuccess?: () => void
}

/**
 * Form component for adding a new brew method.
 * Provides a simple text input with validation and success/error feedback.
 * Optionally calls onSuccess callback after a successful submission.
 */
export function AddMethodForm({ onSuccess }: AddMethodFormProps = {}) {
  const { control, handleSubmit, reset } = useForm<MethodFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: MethodFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await addMethod(data)
      reset()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSuccess?.()
    } catch {
      setError('Failed to add method')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Method added successfully!
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Input
          control={control}
          name="name"
          label="Method Name"
          rules={{ required: 'Method name is required' }}
        />

        <Button
          type="submit"
          variant="contained"
          startIcon={<LocalCafe />}
          disabled={isSubmitting}
          fullWidth
          sx={{
            mt: 2,
            bgcolor: '#8B4513',
            '&:hover': { bgcolor: '#6B3410' },
          }}
        >
          {isSubmitting ? 'Adding Method...' : 'Add Method'}
        </Button>
      </Stack>
    </Box>
  )
}
