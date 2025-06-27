'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Typography,
  Slider,
  Stack,
  Alert,
  Chip,
} from '@mui/material'
import { FormInputProps } from './formTypes'
import { getGrinderSettings, GrinderSettings } from '../actions/grinderActions'

interface GrindSettingInputProps extends FormInputProps {
  grinderId?: string
}

export const GrindSettingInput: React.FC<GrindSettingInputProps> = ({
  formData,
  updateFormData,
  grinderId,
}) => {
  const [grinderSettings, setGrinderSettings] =
    useState<GrinderSettings | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch grinder settings when grinderId changes
  useEffect(() => {
    const fetchGrinderSettings = async () => {
      if (!grinderId) {
        setGrinderSettings(null)
        return
      }

      setLoading(true)
      try {
        const settings = await getGrinderSettings(grinderId)
        setGrinderSettings(settings)
      } catch (error) {
        console.error('Error fetching grinder settings:', error)
        setGrinderSettings(null)
      } finally {
        setLoading(false)
      }
    }

    fetchGrinderSettings()
  }, [grinderId])

  // Use grinder settings or defaults
  const minSetting = grinderSettings?.min_setting || 1
  const maxSetting = grinderSettings?.max_setting || 40
  const stepSize = grinderSettings?.step_size || 1
  const settingType = grinderSettings?.setting_type || 'numeric'

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    updateFormData({
      grind: newValue as number,
    })
  }

  const handleTextFieldChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value)
    if (!isNaN(value) && value >= minSetting && value <= maxSetting) {
      updateFormData({
        grind: value,
      })
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Set your grinder setting for this brew
      </Typography>

      {/* Grinder Info */}
      {grinderSettings && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            flexWrap="wrap"
            sx={{ gap: 1 }}
          >
            <Typography variant="body2">
              <strong>{grinderSettings.name}</strong> settings:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              <Chip label={`Range: ${minSetting}-${maxSetting}`} size="small" />
              <Chip label={`Step: ${stepSize}`} size="small" />
              <Chip label={`Type: ${settingType}`} size="small" />
            </Stack>
          </Stack>
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Slider */}
        <Box>
          <Stack
            spacing={2}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mb: 1 }}
          >
            <Typography
              variant="body2"
              sx={{ minWidth: { xs: 'auto', sm: 60 } }}
            >
              Fine ({minSetting})
            </Typography>
            <Slider
              value={formData.grind || minSetting}
              onChange={handleSliderChange}
              min={minSetting}
              max={maxSetting}
              step={stepSize}
              marks={[
                { value: minSetting, label: minSetting.toString() },
                {
                  value: Math.round((minSetting + maxSetting) / 2),
                  label: Math.round((minSetting + maxSetting) / 2).toString(),
                },
                { value: maxSetting, label: maxSetting.toString() },
              ]}
              sx={{ flex: 1 }}
              disabled={loading}
            />
            <Typography
              variant="body2"
              sx={{ minWidth: { xs: 'auto', sm: 70 } }}
            >
              Coarse ({maxSetting})
            </Typography>
          </Stack>
        </Box>

        {/* Text Input */}
        <TextField
          label="Grind Setting"
          type="number"
          value={formData.grind || ''}
          onChange={handleTextFieldChange}
          inputProps={{
            min: minSetting,
            max: maxSetting,
            step: stepSize,
          }}
          helperText={`Enter a value between ${minSetting} and ${maxSetting} (step: ${stepSize})`}
          disabled={loading}
          sx={{ maxWidth: 250 }}
        />

        {/* Current Value Display */}
        {formData.grind && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.light',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="primary.dark">
              Current Setting: {formData.grind}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formData.grind <= (minSetting + maxSetting) / 3
                ? 'Fine grind'
                : formData.grind >= ((minSetting + maxSetting) * 2) / 3
                  ? 'Coarse grind'
                  : 'Medium grind'}
            </Typography>
          </Box>
        )}

        {/* Loading State */}
        {loading && <Alert severity="info">Loading grinder settings...</Alert>}

        {/* No Grinder Selected */}
        {!grinderId && (
          <Alert severity="warning">
            Select a grinder in Step 1 to see specific settings. Using default
            range (1-40).
          </Alert>
        )}
      </Stack>
    </Box>
  )
}
