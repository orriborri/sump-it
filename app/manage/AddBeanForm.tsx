'use client'

import React from 'react'
import { Box, Button, Stack, Alert } from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '../common/Input'
import { BeanFormData, addBean } from './actions'
import { Coffee } from '@mui/icons-material'

interface AddBeanFormProps {
  onSuccess?: () => void
}

export const AddBeanForm = ({ onSuccess }: AddBeanFormProps = {}) => {
  const { control, handleSubmit, reset } = useForm<BeanFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (data: BeanFormData) => {
    setIsSubmitting(true)
    try {
      await addBean(data)
      reset()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to add bean:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Coffee bean added successfully!
        </Alert>
      )}
      
      <Stack spacing={2}>
        <Input
          control={control}
          name="name"
          label="Bean Name"
          rules={{ required: 'Bean name is required' }}
        />
        <Input
          control={control}
          name="roster"
          label="Roster"
        />
        <Input
          control={control}
          name="rostery"
          label="Roastery"
        />
        <Input
          control={control}
          name="roast_level"
          label="Roast Level"
        />
        
        <Button
          type="submit"
          variant="contained"
          startIcon={<Coffee />}
          disabled={isSubmitting}
          fullWidth
          sx={{ 
            mt: 2,
            bgcolor: '#8B4513', 
            '&:hover': { bgcolor: '#6B3410' }
          }}
        >
          {isSubmitting ? 'Adding Bean...' : 'Add Coffee Bean'}
        </Button>
      </Stack>
    </Box>
  )
}
