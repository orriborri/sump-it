'use client'
import React, { useEffect } from 'react'
import { Box, TextField, Typography, Stack, Alert, IconButton } from '@mui/material'
import { Add, Remove } from '@mui/icons-material'
import { FormInputProps } from './types'
import { useGrinderSettings } from '../equipment/useGrinderSettings'

interface GrindSettingInputProps extends FormInputProps {
  grinderId?: string
}

export const GrindSettingInput: React.FC<GrindSettingInputProps> = ({
  formData,
  updateFormData,
  grinderId,
}) => {
  const { grinderSettings, loading, error } = useGrinderSettings(grinderId)

  // Use grinder settings or defaults
  const minSetting = grinderSettings?.min_setting || 1
  const maxSetting = grinderSettings?.max_setting || 40
  const stepSize = grinderSettings?.step_size || 1

  // Initialize grind setting when grinder settings are loaded
  useEffect(() => {
    if (grinderSettings && !formData.grind) {
      const defaultGrind = Math.round((minSetting + maxSetting) / 2)
      updateFormData({ grind: defaultGrind })
    }
  }, [grinderSettings, formData.grind, updateFormData, minSetting, maxSetting])

  const currentGrind = formData.grind ?? minSetting

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value)
    if (!isNaN(value)) {
      updateFormData({ grind: value })
    }
  }

  const handleIncrement = () => {
    const newValue = Math.min(currentGrind + stepSize, maxSetting)
    updateFormData({ grind: newValue })
  }

  const handleDecrement = () => {
    const newValue = Math.max(currentGrind - stepSize, minSetting)
    updateFormData({ grind: newValue })
  }

  if (loading) {
    return <Alert severity="info">Loading grinder settings...</Alert>
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading grinder settings. Using default range (1-40).
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        Grind Setting
      </Typography>

      {/* Grind Setting Input */}
      <Box display="flex" alignItems="center" gap={1} maxWidth={280}>
        <IconButton
          onClick={handleDecrement}
          disabled={currentGrind <= minSetting}
          size="small"
        >
          <Remove />
        </IconButton>

        <TextField
          label="Setting"
          type="number"
          value={currentGrind}
          onChange={handleChange}
          inputProps={{
            min: minSetting,
            max: maxSetting,
            step: stepSize,
            style: { textAlign: 'center' }
          }}
          size="small"
          sx={{ flex: 1 }}
        />

        <IconButton
          onClick={handleIncrement}
          disabled={currentGrind >= maxSetting}
          size="small"
        >
          <Add />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Range: {minSetting} - {maxSetting} (step: {stepSize})
      </Typography>

      {!grinderId && (
        <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
          Select a grinder to see specific settings
        </Alert>
      )}
    </Stack>
  )
}
