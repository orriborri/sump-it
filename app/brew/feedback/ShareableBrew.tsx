'use client'
import React, { useState } from 'react'
import { Box, Typography, Button, Rating, Stack, Card, CardContent, TextField, Chip } from '@mui/material'
import { Share, Coffee, Scale, Water, Settings } from '@mui/icons-material'
import { generateBrewSuggestions } from './BrewSuggestions'
import { saveBrewFeedback } from './actions'

interface BrewData {
  id: number
  bean_name: string
  method_name: string
  grinder_name: string
  dose: number
  water: number
  ratio: number
  grind: number
}

interface ShareableBrewProps {
  brewData: BrewData
}

export const ShareableBrew: React.FC<ShareableBrewProps> = ({ brewData }) => {
  const [feedback, setFeedback] = useState({
    too_weak: false,
    too_strong: false,
    grind_too_coarse: false,
    grind_too_fine: false,
    is_bitter: false,
    is_sour: false,
    overall_rating: 0
  })

  const [suggestions, setSuggestions] = useState({
    grind: brewData.grind,
    ratio: brewData.ratio,
    reason: ''
  })

  // Update suggestions when feedback changes
  React.useEffect(() => {
    const newSuggestions = generateBrewSuggestions(feedback, { grind: brewData.grind, ratio: brewData.ratio })
    setSuggestions(newSuggestions)
  }, [feedback, brewData.grind, brewData.ratio])

  const handleSaveFeedback = async () => {
    const feedbackData = {
      ...feedback,
      recommended_grind_adjustment: suggestions.grind - brewData.grind,
      grind_notes: `Next brew: Grind ${suggestions.grind}, Ratio 1:${suggestions.ratio}. ${suggestions.reason}`
    }
    
    await saveBrewFeedback(brewData.id, feedbackData)
    alert('Feedback saved!')
  }

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/brew/${brewData.id}/rate`
    : `/brew/${brewData.id}/rate`

  return (
    <Stack spacing={3}>
      {/* Brew Details */}
      <Card sx={{ 
        bgcolor: '#F5F5DC',
        border: '2px solid #8B4513', 
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)'
      }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#8B4513' }}>
                ☕ {brewData.bean_name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={brewData.method_name} size="small" sx={{ bgcolor: '#8B4513', color: 'white' }} />
                <Chip label={brewData.grinder_name} size="small" sx={{ bgcolor: '#D2691E', color: 'white' }} />
              </Stack>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Share />}
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              size="small"
            >
              Copy Link
            </Button>
          </Box>

          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={0.5}>
              <Scale fontSize="small" sx={{ color: '#8B4513' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#654321' }}>
                {brewData.dose}g
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Water fontSize="small" sx={{ color: '#4682B4' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#654321' }}>
                {brewData.water}ml
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Coffee fontSize="small" sx={{ color: '#8B4513' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#654321' }}>
                1:{brewData.ratio}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Settings fontSize="small" sx={{ color: '#696969' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#654321' }}>
                Grind {brewData.grind}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Single Feedback Card */}
      <Card sx={{ bgcolor: '#F5F5DC', border: '2px solid #8B4513' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#8B4513', mb: 2 }}>
            How was this brew?
          </Typography>

          {/* Rating */}
          <Box mb={3}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#654321' }}>Overall Rating</Typography>
            <Rating 
              size="large" 
              value={feedback.overall_rating}
              onChange={(_, value) => setFeedback(prev => ({ ...prev, overall_rating: value || 0 }))}
            />
          </Box>

          {/* Quick Taste Feedback */}
          <Box mb={3}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#654321' }}>Taste Notes</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {[
                { key: 'too_weak', label: 'Too Weak' },
                { key: 'too_strong', label: 'Too Strong' },
                { key: 'is_bitter', label: 'Bitter' },
                { key: 'is_sour', label: 'Sour' },
                { key: 'grind_too_coarse', label: 'Grind Too Coarse' },
                { key: 'grind_too_fine', label: 'Grind Too Fine' }
              ].map(({ key, label }) => (
                <Chip
                  key={key}
                  label={label}
                  clickable
                  color={feedback[key as keyof typeof feedback] ? 'primary' : 'default'}
                  onClick={() => setFeedback(prev => ({ 
                    ...prev, 
                    [key]: !prev[key as keyof typeof prev] 
                  }))}
                />
              ))}
            </Stack>
          </Box>

          {/* Auto-generated suggestions (always visible if feedback given) */}
          {(feedback.too_weak || feedback.too_strong || feedback.is_bitter || feedback.is_sour || feedback.grind_too_coarse || feedback.grind_too_fine) && (
            <Box mb={3} sx={{ bgcolor: 'rgba(139, 69, 19, 0.05)', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#8B4513' }}>
                💡 Next Brew Suggestions
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#654321' }}>
                {suggestions.reason}
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Grind Setting"
                  type="number"
                  value={suggestions.grind}
                  onChange={(e) => setSuggestions(prev => ({ ...prev, grind: Number(e.target.value) }))}
                  size="small"
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Ratio (1:x)"
                  type="number"
                  value={suggestions.ratio}
                  onChange={(e) => setSuggestions(prev => ({ ...prev, ratio: Number(e.target.value) }))}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Stack>
            </Box>
          )}

          <Button 
            variant="contained" 
            size="large"
            onClick={handleSaveFeedback}
            disabled={feedback.overall_rating === 0}
            fullWidth
          >
            Save Feedback & Suggestions
          </Button>
        </CardContent>
      </Card>
    </Stack>
  )
}
