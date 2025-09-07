'use client'

import { Box, Button, Stack, Alert } from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '../common/Input'
import { BeanFormData, addBean } from './actions'
import { Coffee } from '@mui/icons-material'

export const AddBeanForm = () => {
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
          placeholder="e.g., Ethiopian Yirgacheffe"
          rules={{ required: 'Bean name is required' }}
        />
        <Input
          control={control}
          name="roster"
          label="Roaster"
          placeholder="e.g., Blue Bottle Coffee"
        />
        <Input
          control={control}
          name="origin"
          label="Origin"
          placeholder="e.g., Ethiopia, Yirgacheffe"
        />
        <Input
          control={control}
          name="roast_level"
          label="Roast Level"
          placeholder="e.g., Light, Medium, Dark"
        />
        
        <Button
          type="submit"
          variant="contained"
          startIcon={<Coffee />}
          disabled={isSubmitting}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isSubmitting ? 'Adding Bean...' : 'Add Coffee Bean'}
        </Button>
      </Stack>
    </Box>
  )
}
