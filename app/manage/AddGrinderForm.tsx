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
      await createGrinder({
        name: name.trim(),
        min_setting: 1,
        max_setting: 40,
        step_size: 1.0,
        setting_type: 'numeric',
      })

      setName('')
      setMessage({ type: 'success', text: 'Grinder added successfully!' })
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
