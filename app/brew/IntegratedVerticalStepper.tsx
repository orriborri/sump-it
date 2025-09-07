'use client'
import React from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Collapse,
} from '@mui/material'
import { Check } from '@mui/icons-material'

interface IntegratedVerticalStepperProps {
  steps: string[]
  activeStep: number
  getStepInstructions: (stepIndex: number) => { title: string; description: string }
  getStepContent: (stepIndex: number) => React.ReactNode
}

export const IntegratedVerticalStepper: React.FC<IntegratedVerticalStepperProps> = ({
  steps,
  activeStep,
  getStepInstructions,
  getStepContent,
}) => {
  return (
    <Stack spacing={0}>
      {steps.map((label, index) => {
        const isActive = index === activeStep
        const isCompleted = index < activeStep
        const isUpcoming = index > activeStep
        const instructions = getStepInstructions(index)

        return (
          <Box key={label}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              {/* Step Number/Icon */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isCompleted 
                    ? 'success.main' 
                    : isActive 
                      ? 'primary.main' 
                      : 'grey.300',
                  color: isCompleted || isActive ? 'white' : 'grey.600',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  mt: 1,
                  boxShadow: isActive ? 2 : 1,
                }}
              >
                {isCompleted ? (
                  <Check sx={{ fontSize: 20 }} />
                ) : (
                  <Typography variant="body1" fontWeight="bold">
                    {index + 1}
                  </Typography>
                )}
              </Box>

              {/* Step Content */}
              <Box sx={{ flex: 1, pb: 4 }}>
                {/* Step Header */}
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="h6"
                    fontWeight={isActive ? 600 : 500}
                    color={
                      isCompleted 
                        ? 'success.main' 
                        : isActive 
                          ? 'primary.main' 
                          : 'text.secondary'
                    }
                    sx={{ 
                      lineHeight: 1.3,
                      transition: 'all 0.3s ease',
                      mb: 0.5,
                    }}
                  >
                    {label}
                  </Typography>
                  
                  {/* Status Chip */}
                  {isActive && (
                    <Chip
                      label="Current Step"
                      size="small"
                      color="primary"
                      sx={{ 
                        height: 22, 
                        fontSize: '0.7rem',
                        mb: 1,
                        '& .MuiChip-label': {
                          px: 1.5,
                        }
                      }}
                    />
                  )}
                  {isCompleted && (
                    <Chip
                      label="Completed"
                      size="small"
                      color="success"
                      sx={{ 
                        height: 22, 
                        fontSize: '0.7rem',
                        mb: 1,
                        '& .MuiChip-label': {
                          px: 1.5,
                        }
                      }}
                    />
                  )}
                </Box>

                {/* Step Instructions - Always visible for active step */}
                {isActive && (
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      mb: 3,
                      bgcolor: '#FFFFFF',
                      border: 1,
                      borderColor: '#8B4513',
                      borderRadius: 2,
                    }}
                  >
                    <Typography 
                      variant="subtitle1" 
                      color="#2C1810"
                      fontWeight={600}
                      gutterBottom
                    >
                      {instructions.title}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="#3C2415"
                      sx={{ lineHeight: 1.6, fontSize: '0.95rem' }}
                    >
                      {instructions.description}
                    </Typography>
                  </Paper>
                )}

                {/* Step Form Content - Only for active step */}
                <Collapse in={isActive} timeout={300}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3,
                      bgcolor: 'background.default',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    {isActive && getStepContent(index)}
                  </Paper>
                </Collapse>

                {/* Completed step summary */}
                {isCompleted && (
                  <Typography 
                    variant="body2" 
                    color="success.main"
                    sx={{ 
                      fontStyle: 'italic',
                      mt: 1,
                    }}
                  >
                    ✓ {instructions.title}
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Vertical Connector Line */}
            {index < steps.length - 1 && (
              <Box
                sx={{
                  width: 3,
                  height: 32,
                  bgcolor: isCompleted ? 'success.main' : isActive ? 'primary.main' : 'grey.300',
                  ml: 2.25,
                  transition: 'all 0.3s ease',
                }}
              />
            )}
          </Box>
        )
      })}
    </Stack>
  )
}
