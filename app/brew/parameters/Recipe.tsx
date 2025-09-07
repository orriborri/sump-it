'use client'
import React, { useState } from 'react'
import { Stack, TextField, Typography, Box, IconButton } from '@mui/material'
import { Lock, LockOpen } from '@mui/icons-material'
import { FormData } from '../types'

interface RecipeProps {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
}

export const Recipe: React.FC<RecipeProps> = ({ formData, updateFormData }) => {
  const [ratioLocked, setRatioLocked] = useState(true)
  const handleCoffeeChange = (value: number) => {
    if (ratioLocked && value > 0) {
      // Keep ratio constant, adjust water
      const water = value * Number(formData.ratio)
      updateFormData({ dose: value, water })
    } else if (!ratioLocked && value > 0 && formData.water > 0) {
      // Calculate new ratio
      const newRatio = formData.water / value
      updateFormData({ dose: value, ratio: newRatio })
    } else {
      // Just update the coffee value
      updateFormData({ dose: value })
    }
  }

  const handleWaterChange = (value: number) => {
    if (ratioLocked && value > 0) {
      // Keep ratio constant, adjust coffee
      const coffee = value / Number(formData.ratio)
      updateFormData({ water: value, dose: coffee })
    } else if (!ratioLocked && value > 0 && formData.dose > 0) {
      // Calculate new ratio
      const newRatio = value / formData.dose
      updateFormData({ water: value, ratio: newRatio })
    } else {
      // Just update the water value
      updateFormData({ water: value })
    }
  }

  const handleRatioChange = (value: number) => {
    if (value > 0) {
      // Keep coffee constant, adjust water
      const water = formData.dose * value
      updateFormData({ ratio: value, water })
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        {ratioLocked ? 'Ratio locked - changing amounts scales recipe' : 'Ratio unlocked - changing amounts recalculates ratio'}
      </Typography>
      
      <Box display="flex" gap={2} flexWrap="wrap">
        <TextField
          label="Coffee (g)"
          type="number"
          value={formData.dose}
          onChange={(e) => handleCoffeeChange(Number(e.target.value))}
          inputProps={{ min: 5, max: 50 }}
          sx={{ minWidth: 120 }}
        />
        
        <TextField
          label="Water (ml)"
          type="number"
          value={formData.water}
          onChange={(e) => handleWaterChange(Number(e.target.value))}
          inputProps={{ min: 50, max: 1000 }}
          sx={{ minWidth: 120 }}
        />
        
        <Box display="flex" alignItems="center">
          <TextField
            label="Ratio (1:x)"
            type="number"
            value={Number(formData.ratio).toFixed(1)}
            onChange={(e) => handleRatioChange(Number(e.target.value))}
            inputProps={{ min: 10, max: 20, step: 0.1 }}
            disabled={ratioLocked}
            sx={{ minWidth: 120 }}
          />
          <IconButton 
            onClick={() => setRatioLocked(!ratioLocked)}
            color={ratioLocked ? 'primary' : 'default'}
            size="small"
          >
            {ratioLocked ? <Lock /> : <LockOpen />}
          </IconButton>
        </Box>
      </Box>
    </Stack>
  )
}
