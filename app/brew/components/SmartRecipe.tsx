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
import { getBrewsWithFeedback } from '../enhanced-actions'
import type { BrewWithFeedback } from '../enhanced-actions'
import { getBrewRecommendation } from '../actions/recommendationActions'
import type { BrewRecommendation } from '../services/BrewRecommendationService'
// import { ParameterVisualization } from "../recipe/ParameterVisualization";

interface SmartRecipeProps {
  formData: FormData
  updateFormData: (_updates: Partial<FormData>) => void
}

export const SmartRecipe: React.FC<SmartRecipeProps> = ({
  formData,
  updateFormData,
}) => {
  const [previousBrews, setPreviousBrews] = useState<BrewWithFeedback[]>([])
  const [recommendation, setRecommendation] =
    useState<BrewRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showVisualization, setShowVisualization] = useState(false)
  const [selectedBrewId, setSelectedBrewId] = useState<number | null>(null)

  // Clear selection if parameters are manually changed
  useEffect(() => {
    if (selectedBrewId && previousBrews.length > 0) {
      const selectedBrew = previousBrews.find(
        brew => brew.id === selectedBrewId
      )
      if (selectedBrew) {
        // Check if current form data still matches the selected brew
        const stillMatches =
          formData.water === selectedBrew.water &&
          formData.dose === selectedBrew.dose &&
          formData.grind === selectedBrew.grind &&
          formData.ratio === selectedBrew.ratio

        if (!stillMatches) {
          // Parameters were manually changed, clear selection
          setSelectedBrewId(null)
        }
      }
    }
  }, [
    formData.water,
    formData.dose,
    formData.grind,
    formData.ratio,
    selectedBrewId,
    previousBrews,
  ])

  useEffect(() => {
    const fetchBrewData = async () => {
      if (!formData.bean_id || !formData.method_id || !formData.grinder_id) {
        setPreviousBrews([])
        setRecommendation(null)
        setSelectedBrewId(null) // Clear selection when changing bean/method/grinder
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

        // Get intelligent recommendation via server action
        const smartRecommendation = await getBrewRecommendation(
          formData.bean_id.toString(),
          formData.method_id.toString(),
          formData.grinder_id.toString()
        )
        setRecommendation(smartRecommendation)

        // Clear selection when data changes
        setSelectedBrewId(null)
      } catch (error) {
        console.error('Error fetching brew data:', error)
      } finally {
        setLoading(false)
        setLoaded(true)
      }
    }

    fetchBrewData()
  }, [formData.bean_id, formData.method_id, formData.grinder_id])

  const handleUseRecommendation = () => {
    if (recommendation) {
      updateFormData({
        water: recommendation.water,
        dose: recommendation.dose,
        grind: recommendation.grind,
        ratio: recommendation.ratio,
      })
      // Clear selected brew since we're using recommendation
      setSelectedBrewId(null)
    }
  }

  const handleSelectBrew = (brew: BrewWithFeedback) => {
    console.log('Selecting brew:', brew) // Debug log
    updateFormData({
      water: brew.water ?? undefined,
      dose: brew.dose ?? undefined,
      grind: brew.grind ?? undefined,
      ratio: brew.ratio ?? undefined,
    })

    // Set this brew as the selected one
    setSelectedBrewId(brew.id)
    console.log('Updated form data with brew parameters')
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
            <Skeleton key={i} variant="rectangular" height={140} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Smart Recipe Recommendations
      </Typography>

      {/* Current Parameters Display */}
      {(formData.water ||
        formData.dose ||
        formData.grind ||
        formData.ratio) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Typography variant="subtitle2">Current Parameters</Typography>
            {selectedBrewId && (
              <Chip
                label={`From Brew #${selectedBrewId}`}
                color="primary"
                size="small"
              />
            )}
          </Stack>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Water: {formData.water || '?'}ml • Coffee: {formData.dose || '?'}g •
            Ratio: 1:{formData.ratio || '?'} • Grind: {formData.grind || '?'}
          </Typography>
        </Alert>
      )}

      {/* Intelligent Recommendation */}
      {recommendation && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleUseRecommendation}
              variant="outlined"
              sx={{
                minWidth: { xs: '100%', sm: 'auto' },
                mt: { xs: 1, sm: 0 },
              }}
            >
              Use These Parameters
            </Button>
          }
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Typography variant="subtitle2">Recommended Parameters</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`${recommendation.confidence} confidence`}
                color={getConfidenceColor(recommendation.confidence) as any}
                size="small"
              />
              {recommendation.basedOnBrews &&
                recommendation.basedOnBrews > 0 && (
                  <Chip
                    label={`${recommendation.basedOnBrews} brews analyzed`}
                    size="small"
                  />
                )}
            </Stack>
          </Stack>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Water: {recommendation.water}ml • Coffee: {recommendation.dose}g •
            Ratio: 1:{recommendation.ratio} • Grind: {recommendation.grind}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            {recommendation.reasoning}
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
              {showVisualization ? 'Hide' : 'Show'} Interactive Tuning
            </Button>
          </Stack>

          {showVisualization && (
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2">
                Parameter visualization temporarily disabled
              </Typography>
            </Box>
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
            {recommendation &&
              " We've provided recommended parameters above to get you started."}
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

              // Check if this specific brew is selected
              const isSelected = selectedBrewId === brew.id

              return (
                <Card
                  key={brew.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out',
                    },
                    border: isSelected
                      ? '3px solid'
                      : hasGoodRating
                        ? '2px solid'
                        : '1px solid',
                    borderColor: isSelected
                      ? 'primary.main'
                      : hasGoodRating
                        ? 'success.main'
                        : 'divider',
                    bgcolor: isSelected ? 'primary.light' : 'background.paper',
                    height: '100%',
                    width: '100%',
                    maxWidth: '100%',
                    userSelect: 'none',
                  }}
                  onClick={() => handleSelectBrew(brew)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectBrew(brew)
                    }
                  }}
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
                      <Stack direction="row" spacing={0.5}>
                        {isSelected && (
                          <Chip label="Selected" color="primary" size="small" />
                        )}
                        {brew.feedback?.overall_rating && (
                          <Chip
                            label={`${brew.feedback.overall_rating}★`}
                            color={hasGoodRating ? 'success' : 'default'}
                            size="small"
                          />
                        )}
                      </Stack>
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
                    <Typography variant="body2">Grind: {brew.grind}</Typography>

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
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}
