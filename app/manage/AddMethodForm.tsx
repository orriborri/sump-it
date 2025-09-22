'use client'
import { Box, Button, Stack, Alert, Chip } from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '../common/Input'
import { MethodFormData, addMethod } from './actions'
import { LocalCafe } from '@mui/icons-material'

const popularMethods = ['V60', 'French Press', 'AeroPress', 'Chemex', 'Espresso', 'Cold Brew']

export const AddMethodForm = () => {
  const { control, handleSubmit, reset, setValue } = useForm<MethodFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (data: MethodFormData) => {
    setIsSubmitting(true)
    try {
      await addMethod(data)
      reset()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      // Error handling - could add user notification here
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Brew method added successfully!
        </Alert>
      )}
      
      <Stack spacing={2}>
        <Input
          control={control}
          name="name"
          label="Method Name"
          rules={{ required: 'Method name is required' }}
        />
        
        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
            {popularMethods.map((method) => (
              <Chip
                key={method}
                label={method}
                clickable
                size="small"
                onClick={() => setValue('name', method)}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
        
        <Button
          type="submit"
          variant="contained"
          startIcon={<LocalCafe />}
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Adding Method...' : 'Add Brew Method'}
        </Button>
      </Stack>
    </Box>
  )
}
