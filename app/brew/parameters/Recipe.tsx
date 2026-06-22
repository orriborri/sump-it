'use client'
import React, { useState } from 'react'
import {
  Stack,
  TextField,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Lock, LockOpen } from '@mui/icons-material'
import { FormData } from '../types'

interface RecipeProps {
  formData: FormData
  updateFormData: (_updates: Partial<FormData>) => void
}

/**
 * Renders coffee dose, water amount, and ratio inputs with linked calculations
 * When the ratio is locked, changing one value automatically adjusts another to maintain proportions
 * When unlocked, changing dose or water recalculates the ratio
 */
export const Recipe: React.FC<RecipeProps> = ({ formData, updateFormData }) => {
  const [ratioLocked, setRatioLocked] = useState(true)

  /**
   * Handles changes to the coffee dose amount
   * Adjusts water (if ratio locked) or recalculates ratio (if unlocked)
   * @param value - New coffee dose in grams
   */
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

  /**
   * Handles changes to the water amount
   * Adjusts coffee dose (if ratio locked) or recalculates ratio (if unlocked)
   * @param value - New water amount in milliliters
   */
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

  /**
   * Handles direct ratio changes by keeping coffee constant and adjusting water
   * @param value - New ratio value (the x in 1:x)
   */
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
        {ratioLocked
          ? 'Ratio locked - changing amounts scales recipe'
          : 'Ratio unlocked - changing amounts recalculates ratio'}
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap">
        <TextField
          label="Coffee (g)"
          type="number"
          value={formData.dose}
          onChange={e => handleCoffeeChange(Number(e.target.value))}
          inputProps={{ min: 5, max: 50 }}
          sx={{ minWidth: 120 }}
        />

        <TextField
          label="Water (ml)"
          type="number"
          value={formData.water}
          onChange={e => handleWaterChange(Number(e.target.value))}
          inputProps={{ min: 50, max: 1000 }}
          sx={{ minWidth: 120 }}
        />

        <Box display="flex" alignItems="center">
          <TextField
            label="Ratio (1:x)"
            type="number"
            value={Number(formData.ratio).toFixed(1)}
            onChange={e => handleRatioChange(Number(e.target.value))}
            inputProps={{ min: 10, max: 20, step: 0.1 }}
            disabled={ratioLocked}
            sx={{ minWidth: 120 }}
          />
          <Tooltip
            title={
              ratioLocked
                ? 'Unlock ratio to edit manually'
                : 'Lock ratio to scale recipe proportionally'
            }
          >
            <IconButton
              onClick={() => setRatioLocked(!ratioLocked)}
              color={ratioLocked ? 'primary' : 'default'}
              size="small"
            >
              {ratioLocked ? <Lock /> : <LockOpen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Stack>
  )
}
