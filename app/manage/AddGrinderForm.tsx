'use client'
import React from 'react'
import { Box, Button, TextField, Stack, Alert } from '@mui/material'
import { useState } from 'react'
import { createGrinder } from './grinders/actions'

export const AddGrinderForm = () => {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Grinder name is required' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Convert steps per unit to step size
      // Default: 1 step per unit (whole numbers only) = step_size of 1.0
      const stepsPerUnit = 1 // Number of steps between consecutive integers
      const stepSize = 1.0 / stepsPerUnit // Actual step size for the slider

      const result = await createGrinder({
        name: name.trim(),
        min_setting: 1,
        max_setting: 40,
        step_size: stepSize,
        setting_type: 'numeric',
      })

      if (result.success) {
        setName('')
        setMessage({ type: 'success', text: 'Grinder added successfully!' })
        // Optionally redirect after a short delay
        setTimeout(() => {
          window.location.href = '/manage/grinders'
        }, 1500)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to add grinder',
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add grinder' })
      console.error('Failed to add grinder:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {message && <Alert severity={message.type}>{message.text}</Alert>}

        <TextField
          label="Grinder Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          fullWidth
          placeholder="e.g., Baratza Encore"
          disabled={isSubmitting}
          helperText="Default settings: Range 1-40, whole numbers only (1 step per unit)"
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Adding...' : 'Add Grinder'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            href="/manage/grinders/new"
            variant="text"
            size="small"
            disabled={isSubmitting}
          >
            Need custom settings? Use advanced form
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
