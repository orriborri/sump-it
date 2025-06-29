'use client'
import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Slider,
} from '@mui/material'
import { Save, Cancel } from '@mui/icons-material'

interface GrinderFormData {
  name: string
  min_setting: number
  max_setting: number
  step_size: number
  setting_type: string
}

interface GrinderFormProps {
  initialData?: Partial<GrinderFormData>
  onSubmit: (_data: GrinderFormData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

export const GrinderForm: React.FC<GrinderFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  // Convert step_size back to steps per unit for the form
  const initialStepsPerUnit = initialData?.step_size
    ? Math.round(1.0 / initialData.step_size)
    : 1

  const [formData, setFormData] = useState<GrinderFormData>({
    name: initialData?.name || '',
    min_setting: initialData?.min_setting || 1,
    max_setting: initialData?.max_setting || 40,
    step_size: initialData?.step_size || 1.0,
    setting_type: initialData?.setting_type || 'numeric',
  })
  const [stepsPerUnit, setStepsPerUnit] = useState(initialStepsPerUnit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (
    field: keyof GrinderFormData,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const handleStepsPerUnitChange = (steps: number) => {
    setStepsPerUnit(steps)
    const stepSize = 1.0 / steps
    setFormData(prev => ({
      ...prev,
      step_size: stepSize,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      setError('Grinder name is required')
      return
    }

    if (formData.min_setting >= formData.max_setting) {
      setError('Minimum setting must be less than maximum setting')
      return
    }

    if (stepsPerUnit <= 0) {
      setError('Steps per unit must be greater than 0')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {isEditing ? 'Edit Grinder' : 'Add New Grinder'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Grinder Name */}
            <TextField
              label="Grinder Name"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              fullWidth
              placeholder="e.g., Baratza Encore, Comandante C40"
            />

            {/* Setting Type */}
            <FormControl fullWidth>
              <InputLabel>Setting Type</InputLabel>
              <Select
                value={formData.setting_type}
                label="Setting Type"
                onChange={e => handleChange('setting_type', e.target.value)}
              >
                <MenuItem value="numeric">Numeric (1, 2, 3...)</MenuItem>
                <MenuItem value="stepped">Stepped (A1, A2, B1...)</MenuItem>
                <MenuItem value="continuous">Continuous (any decimal)</MenuItem>
              </Select>
            </FormControl>

            {/* Min/Max Settings */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Minimum Setting"
                type="number"
                value={formData.min_setting}
                onChange={e =>
                  handleChange('min_setting', parseInt(e.target.value) || 1)
                }
                inputProps={{ min: 0, max: 100 }}
                required
                fullWidth
              />
              <TextField
                label="Maximum Setting"
                type="number"
                value={formData.max_setting}
                onChange={e =>
                  handleChange('max_setting', parseInt(e.target.value) || 40)
                }
                inputProps={{ min: 1, max: 200 }}
                required
                fullWidth
              />
            </Stack>

            {/* Steps Per Unit */}
            <TextField
              label="Steps Per Unit"
              type="number"
              value={stepsPerUnit}
              onChange={e =>
                handleStepsPerUnitChange(parseInt(e.target.value) || 1)
              }
              inputProps={{ min: 1, max: 20, step: 1 }}
              required
              fullWidth
              helperText="Number of steps between consecutive numbers (e.g., 1 for whole numbers, 5 for five steps between 1-2)"
            />

            {/* Preview */}
            <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Preview
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  This is how your grinder settings will appear:
                </Typography>

                <Stack spacing={2}>
                  <Typography variant="body2">
                    <strong>Range:</strong> {formData.min_setting} -{' '}
                    {formData.max_setting}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Steps per unit:</strong> {stepsPerUnit} (step size:{' '}
                    {formData.step_size.toFixed(2)})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stepsPerUnit === 1
                      ? 'Whole numbers only (1, 2, 3...)'
                      : `${stepsPerUnit} steps between each number (e.g., between 1-2: ${Array.from(
                          { length: stepsPerUnit + 1 },
                          (_, i) => (1 + i * formData.step_size).toFixed(1)
                        ).join(', ')})`}
                  </Typography>

                  {/* Preview Slider */}
                  <Box sx={{ px: 2 }}>
                    <Typography variant="caption" gutterBottom display="block">
                      Sample slider:
                    </Typography>
                    <Slider
                      value={Math.round(
                        (formData.min_setting + formData.max_setting) / 2
                      )}
                      min={formData.min_setting}
                      max={formData.max_setting}
                      step={formData.step_size}
                      marks={[
                        {
                          value: formData.min_setting,
                          label: formData.min_setting.toString(),
                        },
                        {
                          value: formData.max_setting,
                          label: formData.max_setting.toString(),
                        },
                      ]}
                      disabled
                      size="small"
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isSubmitting}
                startIcon={<Cancel />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={<Save />}
              >
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                    ? 'Update Grinder'
                    : 'Add Grinder'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
