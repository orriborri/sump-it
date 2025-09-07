'use client'
import React from 'react'
import { Box, Typography, Rating, Button, Stack, FormControlLabel, Checkbox, TextField } from '@mui/material'
import { FormData } from '../types'

interface BrewRatingProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
  onSubmit?: () => void
}

export const BrewRating: React.FC<BrewRatingProps> = ({
  formData,
  updateFormData,
  onSubmit,
}) => {
  return (
    <Stack spacing={3}>
      {/* Overall Rating */}
      <Box>
        <Typography component="legend">Overall Rating</Typography>
        <Rating
          value={formData.overall_rating || 0}
          onChange={(_, value) => updateFormData({ overall_rating: value })}
          size="large"
        />
      </Box>

      {/* Taste Feedback */}
      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.too_weak || false}
              onChange={(e) => updateFormData({ too_weak: e.target.checked })}
            />
          }
          label="Too Weak"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.too_strong || false}
              onChange={(e) => updateFormData({ too_strong: e.target.checked })}
            />
          }
          label="Too Strong"
        />
      </Stack>

      {/* Grind Feedback */}
      <Stack direction="row" spacing={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.grind_too_fine || false}
              onChange={(e) => updateFormData({ grind_too_fine: e.target.checked })}
            />
          }
          label="Grind Too Fine"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.grind_too_coarse || false}
              onChange={(e) => updateFormData({ grind_too_coarse: e.target.checked })}
            />
          }
          label="Grind Too Coarse"
        />
      </Stack>

      {/* Notes */}
      <TextField
        label="Notes for next brew"
        multiline
        rows={3}
        value={formData.grind_notes || ''}
        onChange={(e) => updateFormData({ grind_notes: e.target.value })}
        placeholder="What would you change for the next brew?"
      />

      {/* Submit Button */}
      <Button
        variant="contained"
        onClick={onSubmit}
        size="large"
        disabled={!formData.overall_rating}
      >
        Save Brew & Feedback
      </Button>
    </Stack>
  )
}
