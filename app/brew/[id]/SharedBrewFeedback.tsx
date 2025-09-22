'use client'
import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Rating,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider,
  Alert,
  Chip,
} from '@mui/material'
import { saveBrewFeedback } from '../enhanced-actions'

interface BrewDetails {
  id: number
  bean_id: number | null
  method_id: number | null
  grinder_id: number | null
  water: number | null
  dose: number | null
  grind: number | null
  ratio: string | null // Changed to string to match database Numeric type
  created_at: string
  bean_name: string
  method_name: string
  grinder_name: string
}

interface SharedBrewFeedbackProps {
  brewDetails: BrewDetails
}

export const SharedBrewFeedback: React.FC<SharedBrewFeedbackProps> = ({
  brewDetails,
}) => {
  const [feedback, setFeedback] = useState({
    overall_rating: 0,
    coffee_amount_ml: 0,
    too_strong: false,
    too_weak: false,
    is_sour: false,
    is_bitter: false,
    notes: '',
  })

  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFeedbackChange = (field: string, value: any) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (feedback.overall_rating === 0) {
      setError('Please provide an overall rating')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await saveBrewFeedback(brewDetails.id, feedback)

      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || 'Failed to save feedback')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Thank you for your feedback!
          </Typography>
          <Typography>
            Your feedback has been saved and will help improve future brews.
          </Typography>
        </Alert>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Brew Details
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip label={brewDetails.bean_name} color="primary" />
              <Chip label={brewDetails.method_name} color="secondary" />
              <Chip label={brewDetails.grinder_name} color="info" />
            </Stack>
            <Typography variant="body2">
              {brewDetails.water || 0}ml water • {brewDetails.dose || 0}g coffee
              • 1:{brewDetails.ratio || 0} ratio • Grind setting{' '}
              {brewDetails.grind || 0}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box>
      {/* Brew Details */}
      <Card
        sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Brew Details
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip
              label={brewDetails.bean_name}
              sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText' }}
            />
            <Chip
              label={brewDetails.method_name}
              sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText' }}
            />
            <Chip
              label={brewDetails.grinder_name}
              sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText' }}
            />
          </Stack>
          <Typography variant="body1">
            {brewDetails.water || 0}ml water • {brewDetails.dose || 0}g coffee •
            1:{brewDetails.ratio || 0} ratio • Grind setting{' '}
            {brewDetails.grind || 0}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Brewed on {new Date(brewDetails.created_at).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How did this brew taste?
          </Typography>

          <Stack spacing={3}>
            {/* Overall Rating */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Overall Rating *
              </Typography>
              <Rating
                value={feedback.overall_rating}
                onChange={(_, value) =>
                  handleFeedbackChange('overall_rating', value || 0)
                }
                size="large"
              />
            </Box>

            <Divider />

            {/* Coffee Amount */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                How much coffee was produced? (optional)
              </Typography>
              <TextField
                type="number"
                value={feedback.coffee_amount_ml}
                onChange={e =>
                  handleFeedbackChange(
                    'coffee_amount_ml',
                    parseInt(e.target.value) || 0
                  )
                }
                label="Amount in ml"
                variant="outlined"
                size="small"
                sx={{ width: 150 }}
              />
            </Box>

            <Divider />

            {/* Taste Feedback */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Taste Characteristics
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Check any that apply to this brew:
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.too_strong}
                      onChange={e =>
                        handleFeedbackChange('too_strong', e.target.checked)
                      }
                    />
                  }
                  label="Too strong"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.too_weak}
                      onChange={e =>
                        handleFeedbackChange('too_weak', e.target.checked)
                      }
                    />
                  }
                  label="Too weak"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.is_sour}
                      onChange={e =>
                        handleFeedbackChange('is_sour', e.target.checked)
                      }
                    />
                  }
                  label="Sour"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.is_bitter}
                      onChange={e =>
                        handleFeedbackChange('is_bitter', e.target.checked)
                      }
                    />
                  }
                  label="Bitter"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Additional Notes */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Additional Comments (optional)
              </Typography>
              <TextField
                multiline
                rows={3}
                value={feedback.notes}
                onChange={e => handleFeedbackChange('notes', e.target.value)}
                placeholder="Any other observations about this brew..."
                variant="outlined"
                fullWidth
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Submit Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting}
          size="large"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </Box>
    </Box>
  )
}
