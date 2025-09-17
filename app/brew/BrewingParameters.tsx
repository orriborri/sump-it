'use client'
import React from 'react'
import { Stack, Alert, Typography, Button, Box } from '@mui/material'
import { Coffee } from '@mui/icons-material'
import { FormData } from './types'
import { Recipe } from './parameters/Recipe'
import { GrindSettingInput } from './parameters/GrindSettingInput'
import { usePreviousBrews } from './usePreviousBrews'
import type { RuntimeType } from '@/app/lib/types'
import type { Grinders } from '@/app/lib/db.d'

interface BrewingParametersProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
  onSubmit?: () => void
  grinders?: RuntimeType<Grinders>[]
}

export const BrewingParameters: React.FC<BrewingParametersProps> = ({
  formData,
  updateFormData,
  onSubmit,
  grinders,
}) => {
  const { previousBrews } = usePreviousBrews(
    formData.bean_id,
    formData.method_id,
    formData.grinder_id
  )

  const lastBrew = previousBrews[0]
  const currentGrinder = grinders?.find(g => g.id === formData.grinder_id)

  // Convert numeric grind setting to display format based on grinder
  const formatGrindSetting = (grindValue: number, grinder?: RuntimeType<Grinders>) => {
    if (!grinder || !grindValue) return grindValue?.toString() || '0'
    
    if (grinder.setting_type === 'stepped' && grinder.min_setting && grinder.step_size) {
      // Convert to step number: (grindValue - min_setting) / step_size + 1
      const stepNumber = Math.round((grindValue - grinder.min_setting) / grinder.step_size) + 1
      return stepNumber.toString()
    }
    
    return grindValue.toString()
  }

  return (
    <Stack spacing={3}>
      {/* Previous Brew Feedback */}
      {lastBrew && (
        <Alert severity="info">
          <Typography variant="subtitle2">Last brew with this combination:</Typography>
          <Typography variant="body2">
            Grind: {formatGrindSetting(lastBrew.grind, currentGrinder)}, Dose: {lastBrew.dose}g, Ratio: 1:{lastBrew.ratio}
          </Typography>
        </Alert>
      )}

      {/* Recipe (Coffee amount, water, ratio) */}
      <Recipe
        formData={formData}
        updateFormData={updateFormData}
      />

      {/* Grind Setting */}
      <GrindSettingInput
        formData={formData}
        updateFormData={updateFormData}
        grinderId={formData.grinder_id > 0 ? formData.grinder_id.toString() : undefined}
      />

      {/* Start Brewing Button */}
      <Box sx={{ pt: 2 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<Coffee />}
          onClick={onSubmit}
          sx={{
            py: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          Start Brewing
        </Button>
      </Box>
    </Stack>
  )
}
