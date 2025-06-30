'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Button,
  Chip,
  Alert,
  Stack,
  Divider,
} from '@mui/material'
import { FormData } from '../types'
import {
  getBrewsWithFeedback,
  suggestOptimalParameters,
  BrewWithFeedback,
  ParameterSuggestion,
} from '../enhanced-actions'
import { ParameterVisualization } from './ParameterVisualization'

interface EnhancedRecipeProps {
  formData: FormData
  updateFormData: (_updates: Partial<FormData>) => void
}

export const EnhancedRecipe: React.FC<EnhancedRecipeProps> = ({
  formData,
  updateFormData,
}) => {
  const [previousBrews, setPreviousBrews] = useState<BrewWithFeedback[]>([])
  const [suggestion, setSuggestion] = useState<ParameterSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showVisualization, setShowVisualization] = useState(false)

  useEffect(() => {
    const fetchBrewData = async () => {
      if (!formData.bean_id || !formData.method_id || !formData.grinder_id) {
        setPreviousBrews([])
        setSuggestion(null)
        return
      }

      setLoading(true)
      try {
        // Fetch previous brews with feedback
        const brews = await getBrewsWithFeedback(
          formData.bean_id.toString(),
          formData.method_id.toString(),
          formData.grinder_id.toString()
        )
        setPreviousBrews(brews)

        // Get optimal parameter suggestion
        const optimalSuggestion = await suggestOptimalParameters(
          formData.bean_id.toString(),
          formData.method_id.toString(),
          formData.grinder_id.toString()
        )
        setSuggestion(optimalSuggestion)
      } catch (error) {
        console.error('Error fetching brew data:', error)
      } finally {
        setLoading(false)
        setLoaded(true)
      }
    }

    fetchBrewData()
  }, [formData.bean_id, formData.method_id, formData.grinder_id])

  const handleUseSuggestion = () => {
    if (suggestion) {
      updateFormData({
        water: suggestion.water,
        dose: suggestion.dose,
        grind: suggestion.grind,
        ratio: suggestion.ratio,
      })
    }
  }

  const handleSelectBrew = (brew: BrewWithFeedback) => {
    updateFormData({
      water: brew.water ?? undefined,
      dose: brew.dose ?? undefined,
      grind: brew.grind ?? undefined,
      ratio: brew.ratio ?? undefined,
    })
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'success'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'default'
    }
  }

  const getFeedbackSummary = (brew: BrewWithFeedback) => {
    if (!brew.feedback) return null

    const issues = []
    if (brew.feedback.too_strong) issues.push('Too Strong')
    if (brew.feedback.too_weak) issues.push('Too Weak')
    if (brew.feedback.is_sour) issues.push('Sour')
    if (brew.feedback.is_bitter) issues.push('Bitter')

    return issues
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Analyzing your brewing history...
        </Typography>
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {[1, 2, 3].map(i => (
            <Box key={i}>
              <Skeleton variant="rectangular" height={140} />
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Recipe Recommendations
      </Typography>

      {/* Optimal Parameter Suggestion */}
      {suggestion && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleUseSuggestion}
              variant="outlined"
            >
              Use These Parameters
            </Button>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            Recommended Parameters
            <Chip
              label={`${suggestion.confidence} confidence`}
              color={getConfidenceColor(suggestion.confidence) as any}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Water: {suggestion.water}ml • Coffee: {suggestion.dose}g • Ratio: 1:
            {suggestion.ratio} • Grind: {suggestion.grind}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {suggestion.reasoning}
          </Typography>
        </Alert>
      )}

      {/* Multiple Matches Visualization */}
      {previousBrews.length > 2 && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Parameter Analysis ({previousBrews.length} previous brews)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowVisualization(!showVisualization)}
            >
              {showVisualization ? 'Hide' : 'Show'} Graph
            </Button>
          </Stack>

          {showVisualization && (
            <ParameterVisualization
              brews={previousBrews}
              onParameterSelect={params => updateFormData(params)}
            />
          )}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Previous Brews History */}
      {loaded && previousBrews.length === 0 ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            No previous brews found
          </Typography>
          <Typography variant="body2">
            This is your first time brewing with this combination of beans,
            method, and grinder.
            {suggestion &&
              " We've provided default parameters above to get you started."}
          </Typography>
        </Box>
      ) : (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Previous Brews History
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Click on any brew to use its parameters as a starting point.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {previousBrews.map(brew => {
              const feedbackIssues = getFeedbackSummary(brew)
              const hasGoodRating =
                brew.feedback?.overall_rating &&
                brew.feedback.overall_rating >= 4

              return (
                <Box key={brew.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 3 },
                      border: hasGoodRating ? '2px solid' : '1px solid',
                      borderColor: hasGoodRating ? 'success.main' : 'divider',
                    }}
                    onClick={() => handleSelectBrew(brew)}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="subtitle1">
                          Brew #{brew.id}
                        </Typography>
                        {brew.feedback?.overall_rating && (
                          <Chip
                            label={`${brew.feedback.overall_rating}★`}
                            color={hasGoodRating ? 'success' : 'default'}
                            size="small"
                          />
                        )}
                      </Stack>

                      <Typography variant="body2">
                        Water: {brew.water}ml
                      </Typography>
                      <Typography variant="body2">
                        Coffee: {brew.dose}g
                      </Typography>
                      <Typography variant="body2">
                        Ratio: 1:{brew.ratio}
                      </Typography>
                      <Typography variant="body2">
                        Grind: {brew.grind}
                      </Typography>

                      {feedbackIssues && feedbackIssues.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {feedbackIssues.map(issue => (
                            <Chip
                              key={issue}
                              label={issue}
                              size="small"
                              color="warning"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 1 }}
                      >
                        {new Date(brew.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}
