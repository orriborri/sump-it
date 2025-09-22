'use client'
import React from 'react'
import { Box, Button, TextField, Stack, Alert, Chip, Typography } from '@mui/material'
import { useState } from 'react'
import { createGrinder } from './grinders/actions'
import { Settings } from '@mui/icons-material'

const popularGrinders = [
  { name: 'Baratza Encore', range: '1-40' },
  { name: 'Comandante C40', range: '1-30' },
  { name: 'Hario Mini Mill', range: '1-20' },
  { name: 'Timemore C2', range: '1-25' }
]

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
      const result = await createGrinder({
        name: name.trim(),
        min_setting: 1,
        max_setting: 40,
        step_size: 1.0,
        setting_type: 'numeric',
      })

      if (result.success) {
        setName('')
        setMessage({ type: 'success', text: '✅ Grinder added successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to add grinder',
        })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to add grinder' })
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

        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: '#654321' }}>
            Popular grinders:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {popularGrinders.map((grinder) => (
              <Chip
                key={grinder.name}
                label={`${grinder.name} (${grinder.range})`}
                clickable
                size="small"
                onClick={() => setName(grinder.name)}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>

        <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
          Default: Range 1-40, whole number steps. Need custom settings? Use the advanced form.
        </Alert>

        <Button
          type="submit"
          variant="contained"
          startIcon={<Settings />}
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Adding Grinder...' : 'Add Grinder'}
        </Button>

        <Button
          href="/manage/grinders/new"
          variant="outlined"
          size="small"
          disabled={isSubmitting}
          fullWidth
        >
          Advanced Grinder Setup
        </Button>
      </Stack>
    </Box>
  )
}
