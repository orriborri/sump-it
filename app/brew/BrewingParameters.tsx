'use client'
import React from 'react'
import { Stack, Alert, Typography, Button, Box } from '@mui/material'
import { Coffee } from '@mui/icons-material'
import { FormData } from './types'
import { Recipe } from './parameters/Recipe'
import { GrindSettingInput } from './parameters/GrindSettingInput'
import { usePreviousBrews } from './usePreviousBrews'

interface BrewingParametersProps {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
  onSubmit?: () => void
}

export const BrewingParameters: React.FC<BrewingParametersProps> = ({
  formData,
  updateFormData,
  onSubmit,
}) => {
  const { previousBrews } = usePreviousBrews(
    formData.bean_id,
    formData.method_id,
    formData.grinder_id
  )

  const lastBrew = previousBrews[0]

  return (
    <Stack spacing={3}>
      {/* Previous Brew Feedback */}
      {lastBrew && (
        <Alert severity="info">
          <Typography variant="subtitle2">Last brew with this combination:</Typography>
          <Typography variant="body2">
            Grind: {lastBrew.grind}, Dose: {lastBrew.dose}g, Ratio: 1:{lastBrew.ratio}
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
