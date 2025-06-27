'use client'
import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material'
import {
  Check,
  RadioButtonUnchecked,
  FiberManualRecord,
} from '@mui/icons-material'

interface CompactVerticalStepperProps {
  steps: string[]
  activeStep: number
  children: React.ReactNode
}

export const CompactVerticalStepper: React.FC<CompactVerticalStepperProps> = ({
  steps,
  activeStep,
  children,
}) => {
  const getStepIcon = (index: number) => {
    if (index < activeStep) {
      return <Check color="success" />
    } else if (index === activeStep) {
      return <FiberManualRecord color="primary" />
    } else {
      return <RadioButtonUnchecked color="disabled" />
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 },
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Compact Step Navigation */}
      <Box
        sx={{
          width: { xs: '100%', md: 280 },
          flexShrink: 0,
          order: { xs: 2, md: 1 },
        }}
      >
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Brewing Progress
            </Typography>

            <LinearProgress
              variant="determinate"
              value={(activeStep / (steps.length - 1)) * 100}
              sx={{ mb: 2 }}
            />

            <Stack spacing={2}>
              {steps.map((step, index) => (
                <Box
                  key={step}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                >
                  {getStepIcon(index)}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={index === activeStep ? 600 : 400}
                      color={
                        index === activeStep ? 'primary' : 'text.secondary'
                      }
                      sx={{
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                      }}
                    >
                      {step}
                    </Typography>
                    {index === activeStep && (
                      <Chip
                        label="Current"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          minHeight: { xs: 400, md: 500 },
          order: { xs: 1, md: 2 },
          width: { xs: '100%', md: 'auto' },
          minWidth: 0,
        }}
      >
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                wordBreak: 'break-word',
              }}
            >
              {steps[activeStep]}
            </Typography>
            <Box sx={{ width: '100%', overflow: 'hidden' }}>{children}</Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
