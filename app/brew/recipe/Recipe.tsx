'use client'
import React, { useState } from 'react'
import { Box, Typography, Card, CardContent, Skeleton } from '@mui/material'
import { FormData } from '../workflow/types'
import { getPreviousBrews } from '../workflow/actions'
import { BrewsWithJoins } from '../../lib/generated-models/BrewsJoined'

interface RecipeProps {
  formData: FormData
  updateFormData: (_updates: Partial<FormData>) => void
}

export const Recipe: React.FC<RecipeProps> = ({ formData, updateFormData }) => {
  const [previousBrews, setPreviousBrews] = useState<BrewsWithJoins[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  React.useEffect(() => {
    const fetchBrews = async () => {
      if (!formData.bean_id || !formData.method_id || !formData.grinder_id) {
        setPreviousBrews([])
        return
      }

      setLoading(true)
      try {
        const brews = await getPreviousBrews(
          formData.bean_id.toString(),
          formData.method_id.toString(),
          formData.grinder_id.toString()
        )
        setPreviousBrews(brews)
      } catch (error) {
        console.error('Error fetching brews:', error)
      } finally {
        setLoading(false)
        setLoaded(true)
      }
    }

    fetchBrews()
  }, [formData.bean_id, formData.method_id, formData.grinder_id])

  const handleSelectBrew = (brew: BrewsWithJoins) => {
    updateFormData({
      water: brew.water ?? undefined,
      dose: brew.dose ?? undefined,
      grind: brew.grind ?? undefined,
      ratio: brew.ratio ?? undefined,
    })
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Loading previous brews...
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
          {[1, 2, 3].map(i => (
            <Box key={i}>
              <Skeleton variant="rectangular" height={140} />
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  if (loaded && previousBrews.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          No previous brews found with this combination
        </Typography>
        <Typography variant="body2">
          Continue to set up a new brew with your selected parameters.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Previous brews with the same beans, method, and grinder
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Select a previous brew to use its parameters as a starting point.
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
        {previousBrews.map(brew => (
          <Box key={brew.id}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 },
              }}
              onClick={() => handleSelectBrew(brew)}
            >
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Brew #{brew.id}
                </Typography>
                <Typography variant="body2">Water: {brew.water}ml</Typography>
                <Typography variant="body2">Coffee: {brew.dose}g</Typography>
                <Typography variant="body2">Ratio: 1:{brew.ratio}</Typography>
                <Typography variant="body2">
                  Grind Setting: {brew.grind}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(brew.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
