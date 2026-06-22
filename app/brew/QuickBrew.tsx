'use client'
import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Chip,
  Rating,
  Alert,
} from '@mui/material'
import { Replay, TrendingUp, AccessTime } from '@mui/icons-material'
import type { QuickBrewConfig } from './quickBrewActions'
import type { FormData } from './types'

interface QuickBrewProps {
  configs: QuickBrewConfig[]
  onSelect: (_config: FormData) => void
}

/**
 * Converts a timestamp string into a human-readable relative time description.
 * Uses compact single-character formatting (e.g. "5m ago") suited for card UI,
 * rather than the verbose format from the shared utility.
 * @param dateString - ISO date string to convert
 * @returns Relative time string like "5m ago", "2h ago", "3d ago", or a formatted date
 * @see app/lib/date.ts#timeAgo for the verbose version using date-fns formatDistanceToNow
 */
function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Displays a list of recent brew configurations as tappable cards
 * Allows users to quickly repeat a previous brew by pre-filling the form
 * Shows bean name, method, grinder, parameters, ratings, and feedback-based suggestions
 */
export const QuickBrew: React.FC<QuickBrewProps> = ({ configs, onSelect }) => {
  if (configs.length === 0) return null

  /**
   * Transforms a QuickBrewConfig into FormData and passes it to the onSelect callback
   * @param config - The selected quick brew configuration to convert and apply
   */
  const handleSelect = (config: QuickBrewConfig) => {
    const formData: FormData = {
      bean_id: config.bean_id,
      method_id: config.method_id,
      grinder_id: config.grinder_id,
      dose: config.dose,
      water: config.water,
      grind: config.grind,
      ratio: config.ratio,
    }
    onSelect(formData)
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Replay sx={{ color: 'primary.main', fontSize: 22 }} />
        <Typography
          variant="h6"
          sx={{ color: 'primary.main', fontWeight: 600 }}
        >
          Quick Brew
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Tap a recent brew to pre-fill your settings and skip straight to brewing.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ overflowX: { sm: 'auto' }, pb: 1 }}
      >
        {configs.map((config) => (
          <Card
            key={config.id}
            sx={{
              minWidth: { sm: 280 },
              maxWidth: { sm: 320 },
              flex: { sm: '0 0 auto' },
              border: '2px solid',
              borderColor: config.suggested_grind ? 'success.main' : 'primary.light',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: (theme) => `0 6px 20px ${theme.palette.primary.main}40`,
                borderColor: 'primary.main',
              },
            }}
          >
            <CardActionArea onClick={() => handleSelect(config)}>
              <CardContent sx={{ p: 2.5 }}>
                {/* Bean name as primary identifier */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}
                  >
                    {config.bean_name}
                  </Typography>
                  {config.last_rating !== null && config.last_rating > 0 && (
                    <Rating
                      value={config.last_rating}
                      readOnly
                      size="small"
                      sx={{ ml: 1, flexShrink: 0 }}
                    />
                  )}
                </Box>

                {/* Method + Grinder chips */}
                <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    label={config.method_name}
                    size="small"
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                  <Chip
                    label={config.grinder_name}
                    size="small"
                    sx={{
                      bgcolor: 'secondary.main',
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                </Stack>

                {/* Parameters */}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ mb: 1.5 }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Dose
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {config.dose}g
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ratio
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      1:{Number(config.ratio).toFixed(1)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Grind
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: config.suggested_grind ? 'success.main' : 'text.primary',
                      }}
                    >
                      {config.grind}
                      {config.suggested_grind && ' ✨'}
                    </Typography>
                  </Box>
                </Stack>

                {/* Suggestion indicator */}
                {config.suggested_grind && (
                  <Alert
                    severity="success"
                    icon={<TrendingUp sx={{ fontSize: 16 }} />}
                    sx={{
                      py: 0,
                      px: 1,
                      mb: 1,
                      '& .MuiAlert-message': { fontSize: '0.75rem', py: 0.5 },
                    }}
                  >
                    Adjusted from feedback
                  </Alert>
                )}

                {/* Footer: time ago + brew count */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(config.last_brewed_at)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {config.brew_count} brew{config.brew_count !== 1 ? 's' : ''}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Box>
  )
}
