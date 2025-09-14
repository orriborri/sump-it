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

export function AddMethodForm({ onSuccess }: AddMethodFormProps = {}) {
  const { control, handleSubmit, reset } = useForm<MethodFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (data: MethodFormData) => {
    setIsSubmitting(true)
    try {
      await addMethod(data)
      reset()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to add method:', error)
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
            '&:hover': { bgcolor: '#6B3410' }
          }}
        >
          {isSubmitting ? 'Adding Method...' : 'Add Method'}
        </Button>
      </Stack>
    </Box>
  )
}
